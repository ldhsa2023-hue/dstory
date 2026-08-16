# Edit Plan → Renderer Integration — Patch Plan

`V3_1_STATUS.md`에 마지막으로 남아있던 항목: "Auto Edit Director가 만든 EditDecision을 FFmpeg 렌더 매니페스트에 실제로 반영"한다. 지금까지 `ffmpegCompiler.js`는 자기 파일 주석에 명시된 원칙("Deliberately simplified vs. the full spec ... don't force unstable effects")에 따라 Effect Track/EditDecision을 전혀 적용하지 않고 SIMPLIFIED로만 표시해왔다. 이 원칙은 유지한다 — **불안정한 필터를 억지로 넣지 않는다**. 대신 안정적으로 구현 가능한 효과만 실제로 적용하고, 나머지는 "왜 적용하지 않았는지"를 렌더 리포트에 정직하게 남긴다.

## 1. 적용 범위 (이번에 실제로 렌더에 반영하는 것)

세그먼트 분할(`trim`+`setpts`) + `concat` 기반의, ffmpeg에서 잘 검증된 안정적인 필터만 사용한다. `zoompan`(프레임 단위 애니메이션)이나 클립 간 `xfade`(교차 페이드 전환)처럼 필터 그래프가 깨지기 쉬운 것은 이번에도 넣지 않는다.

| EditDecision.type | 적용 방식 |
|---|---|
| `PUNCH_ZOOM` / `MICRO_ZOOM` / `PAYOFF_EMPHASIS` | 해당 구간만 `scale`로 확대 후 원래 크기로 `crop`(중앙) — 정적 확대(하드컷 인/아웃), 애니메이션 아님. strength→zoom factor: LOW=1.1x, MEDIUM=1.25x, HIGH=1.4x |
| `SPEED_RAMP` | 해당 구간만 `setpts=PTS/factor`. strength→factor: LOW=1.25x, MEDIUM=1.5x, HIGH=2x |
| `FREEZE` | 해당 구간 시작 프레임 1장을 `tpad=stop_mode=clone`으로 구간 길이만큼 정지 |
| `TRIM` | 해당 구간을 통째로 잘라낸다(concat 리스트에서 제외) — 죽은 시간 실제 삭제 |
| `HOOK_TEXT_TIMING` | 선택된 Hook의 `hook_text`를 `drawtext`로 해당 글로벌 구간에 오버레이 |

## 2. 적용하지 않는 것 (정직하게 렌더 리포트에 기록)

| type | 이유 |
|---|---|
| `CUT` | 앵커/컷 지점 표시일 뿐 자체 필터 동작이 없음 — 현재 하드컷 concat이 이미 컷 지점 역할을 한다 |
| `TRANSITION` | 클립 간 `xfade`는 duration/offset 계산이 세그먼트 편집과 얽히면 깨지기 쉬움 — 다음 과제로 보류 |
| `IMPACT_SFX_CUE` / `MUSIC_CUE` | 실제로 매칭되는 SFX 오디오 자산이 없다(ASSETS에 업로드된 MUSIC 트랙 1개만 있을 뿐, Cue별 개별 오디오 파일 인프라 없음) — 없는 오디오를 상상해서 넣지 않는다 |
| `LOOP_SUGGESTION` | 단일 패스 렌더 동작이 아니라 편집자를 위한 전략 제안 |
| `PACE_NOTE` 및 그 외 알 수 없는 type | 필터 매핑이 정의되지 않음 |

## 3. 좌표 변환 (Single Source of Truth 재사용)

`lib/media/timelineMap.js`의 씬 누적 offset 계산 로직을 `computeSceneOffsets(storyboard)`로 뽑아내어 `buildGlobalSignalMap`과 새 렌더 로직이 **동일한 함수**를 공유한다(같은 계산을 두 곳에서 따로 하지 않는다). EditDecision의 글로벌 `timestamp/endTimestamp`를 이 offset으로 클립별 로컬 좌표로 변환하고, 클립 실제 업로드 길이(`asset.duration_sec`)를 벗어나는 부분은 클램프한다.

## 4. 구현 위치

- `lib/media/timelineMap.js`: `computeSceneOffsets` export 추가, `buildGlobalSignalMap`이 이를 사용하도록 리팩터(동작 변경 없음).
- `lib/render/editApply.js` (신규, 순수 함수): 클립별로 원 duration을 EditDecision 경계로 쪼개 "세그먼트 목록"(`{start, end, effect: {type, params} | null, skip: bool}`)을 만들고, HOOK_TEXT_TIMING은 별도로 글로벌 텍스트 오버레이 목록을 만든다. 어떤 decision이 어떤 clip에 어떻게 매핑됐는지(적용/미적용 + 사유)도 함께 반환한다.
- `lib/render/manifest.js`: `buildRenderManifest`가 `editPlan`(옵션)을 받아 `editApply.js`를 호출, 결과를 `manifest.clips[i].segments`와 `manifest.textOverlays`로 포함. `manifest.decisionReport`에 적용/미적용 전체 목록을 담는다.
- `lib/render/ffmpegCompiler.js`: `segments`가 있으면 클립별로 trim+setpts+효과 필터 체인을 만들어 concat한 뒤 기존 scale/crop/fps 정규화, `textOverlays`가 있으면 subtitles 필터 뒤에 `drawtext`를 체이닝.
- `lib/render/runner.js` + `app/api/production/render/route.js`: 최신 `edit_plans`를 조회해 `runRender`에 전달, `hook`도 조회해 HOOK_TEXT_TIMING에 사용.
- RENDER 탭 UI: "SIMPLIFIED" 고정 문구를 걷어내고, 렌더 리포트의 `decisionReport`를 적용/미적용 목록으로 실제 표시.

## 5. 검증 계획

- 합성 테스트 클립(단색 8초, ffmpeg로 생성) + 수동으로 만든 EditPlan(PUNCH_ZOOM, SPEED_RAMP, FREEZE, TRIM, HOOK_TEXT_TIMING 각 1개 이상 포함)으로 실제 렌더 실행.
- ffprobe로 출력 길이가 TRIM만큼 줄고 SPEED_RAMP 구간만큼 짧아졌는지 실측 확인.
- 키프레임 추출로 FREEZE 구간이 실제로 동일 프레임 반복인지, PUNCH_ZOOM 구간이 확대된 프레이밍인지 육안 확인.
- HOOK_TEXT_TIMING 구간의 프레임에서 텍스트가 실제로 보이는지 확인.
- 미적용 항목(TRANSITION 등)이 리포트에 사유와 함께 나오는지 확인.
- 기존 EditPlan 없이(=null) 렌더했을 때 이전과 동일하게 동작하는지(회귀 없음) 확인.
