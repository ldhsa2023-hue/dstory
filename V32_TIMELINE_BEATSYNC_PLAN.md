# V3.2 Remaining Scope — Timeline UI + Beat Sync — Patch Plan

`V3_1_STATUS.md`의 "Phase A에서 의도적으로 하지 않은 것"에 남아있던 두 항목을 구현한다:
- **Beat Analyzer**: `LocalBeatAnalyzer` — 실제 BPM/온셋 감지 (지금까지는 `blueprint.bpm_range` 같은 Claude 추정 문자열만 있었고 실측값이 전혀 없었다)
- **Timeline UI**: 드래그/트림/줌/트랙 가시성 토글이 가능한 캔버스형 에디터 (지금까지는 EditDecision이 카드 리스트로만 표시됨)

## 1. 기존 구조 재사용 (신규 저장소 만들지 않음)

- `lib/media/timelineMap.js`의 `buildGlobalSignalMap(storyboard, mediaAnalyses)` — 이미 존재하는, 실측 신호를 프로덕션 전체 타임라인으로 합치는 순수 함수. Timeline UI는 이 함수의 결과를 그대로 SIGNALS 트랙으로 그린다. **재구현하지 않는다.**
- `edit_plans.decisions` (최신 `editPlans[0]`) — Auto Edit Director가 만든 EditDecision 배열(`timestamp/endTimestamp/track/type/parameters/reason/signalIds/confidence`)을 EDIT DECISIONS 트랙으로 그린다.
- `production.storyboard` (scene_number/duration_sec/purpose) — CLIPS 트랙의 소스. 절대 좌표(start_time)를 별도로 저장하지 않고, 이전 씬들의 duration_sec 누적합으로 항상 파생 계산한다 — Storyboard가 유일한 source of truth.

## 2. Beat Analyzer 설계

### 2-1. PCM 디코드 (`lib/audio/pcmDecode.js`, 신규)

`lib/media/signalAnalysis.js`와 동일한 `execFile` + 인자 배열 패턴을 따른다(쉘 문자열 금지). ffmpeg로 원본 오디오를 mono 22050Hz 32-bit float PCM으로 디코드해 stdout으로 받는다:

```js
const args = ['-i', absolutePath, '-f', 'f32le', '-ac', '1', '-ar', '22050', 'pipe:1'];
execFileAsync('ffmpeg', args, { timeout: 60000, maxBuffer: 100 * 1024 * 1024, encoding: 'buffer' });
```

100MB maxBuffer ≈ 22050Hz × 4bytes × 1136초(약 19분)까지 안전. 채널 음악 트랙(보통 1~5분)엔 충분하지만, 그보다 긴 파일은 잘릴 수 있다는 제약을 문서에 정직하게 남긴다.

### 2-2. 온셋/BPM 검출 (`lib/audio/beatAnalyzer.js`, 신규)

전문 비트 트래킹 라이브러리(librosa/madmom급)가 아닌, 로컬에서 순수 JS로 계산 가능한 **에너지 기반 온셋 검출 + Inter-Onset-Interval 히스토그램** 방식을 쓴다 — 이 한계를 결과에 정직하게 표기한다(`method` 필드).

1. 10ms hop / 20ms window로 short-time RMS 에너지 envelope 계산
2. Onset Detection Function = `max(0, energy[n] - energy[n-1])` (half-wave rectified 1차 미분)
3. 로컬 median + k×표준편차 임계값으로 피크피킹, 최소 100ms 간격 강제
4. 온셋 간 간격(IOI)을 60~200 BPM 범위(0.3~1.0s)로 필터링 후 히스토그램의 최빈 구간으로 BPM 추정 (`BPM = 60/modal_interval`)
5. Confidence: 최빈 구간 근방(±5%) IOI 비율로 HIGH(>50%)/MEDIUM(25~50%)/LOW(그 외) 산출, 온셋 8개 미만이면 강제로 LOW

반환값: `{ bpm, confidence, onsetTimes: [...], onsetCount, method, durationSec }` — Claude 추정이 아니라 실제 신호 처리 결과이므로 Hook Readiness Score처럼 `reason` 텍스트가 아닌 수치 그대로 노출하되, `method`에 "근사치 — 전문 비트 트래킹 라이브러리 아님, 타악기 위주 트랙에서 정확도가 떨어질 수 있음"을 명시한다.

### 2-3. DB

```sql
CREATE TABLE IF NOT EXISTS beat_analyses (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, production_id TEXT NOT NULL, asset_id TEXT NOT NULL,
  bpm REAL, confidence TEXT, onset_times TEXT, onset_count INTEGER, method TEXT, duration_sec REAL
);
```
`insertBeatAnalysis(...)`, `getLatestBeatAnalysis(productionId)`.

### 2-4. API + UI

- `POST /api/production/audio/analyze-beat { productionId, assetId }` — MUSIC 타입 자산에 대해서만 허용, PCM 디코드 + 분석 후 저장.
- AUDIO 탭: MUSIC 자산이 하나라도 업로드돼 있으면 "ANALYZE BEAT (실측)" 버튼 노출 → BPM/Confidence/온셋 개수 카드 표시. Claude가 만든 `blueprint.bpm_range`(추정)와 실측 BPM을 나란히 보여줘 둘의 차이를 사용자가 직접 확인할 수 있게 한다(추정을 실측으로 조용히 덮어쓰지 않는다).

## 3. Timeline UI 설계

새 탭 `TIMELINE`을 AUTO EDIT과 AUDIO 사이에 추가한다(기존 AUTO EDIT 탭의 카드 리스트는 그대로 유지 — 텍스트 상세 정보용, Timeline은 공간적 개요용).

구성 (신규 의존성 없이 순수 div + inline style + 마우스 이벤트로 구현):
- **Ruler**: 0초부터 `storyboard duration_sec 합`까지, `pixelsPerSecond` 배율로 눈금 표시
- **CLIPS 트랙**: Storyboard 씬마다 블록, 폭 = duration_sec × pixelsPerSecond, 오른쪽 가장자리를 드래그하면 그 씬의 duration_sec만 변경(왼쪽 가장자리 드래그/재정렬은 하지 않음 — scene_number가 Higgsfield/Google Flow 프롬프트 전역에서 참조되므로 순서 변경은 이번 범위에서 제외). mouseup 시 `PATCH /api/production/{id}` `{ storyboard: [...] }`로 저장.
- **SIGNALS 트랙**: `buildGlobalSignalMap` 결과를 얇은 세로 마커로 표시(type별 색상, title 툴팁에 strength/source/confidence)
- **EDIT DECISIONS 트랙**: 최신 `editPlans[0].decisions`를 `timestamp~endTimestamp` 구간 블록으로 표시(type별 색상, hover 시 reason/confidence)
- **BEAT 트랙**: 최신 Beat Analysis가 있으면 onsetTimes를 얇은 마커로 표시, 없으면 "AUDIO 탭에서 Beat 분석 필요" 안내
- **줌 슬라이더**: `pixelsPerSecond` 상태(20~200 범위) 조절, 클라이언트 상태일 뿐 저장하지 않음
- **트랙 가시성 체크박스**: SIGNALS/EDIT DECISIONS/BEAT 각각 show/hide(= "트랙 뮤트") — CLIPS는 항상 표시

## 4. API 변경

`GET /api/production/[id]`에 파생 필드 추가(신규 저장 없음, 매 요청마다 계산):
- `signalMap: buildGlobalSignalMap(production.storyboard, mediaAnalyses)`
- `latestBeatAnalysis: getLatestBeatAnalysis(production.id)`

## 5. 이번에도 하지 않는 것 (정직하게 기록)

- **씬 순서 재배열(드래그로 reorder)**: scene_number가 Higgsfield/Google Flow 프롬프트 전체에서 참조되는 키이므로, 재배열은 프롬프트 재생성을 요구하는 훨씬 큰 변경이 된다. 이번 Timeline UI는 트림(길이 조절)만 지원한다.
- **Edit Plan을 렌더러에 자동 적용**: EditDecision(Punch Zoom 등)을 FFmpeg 렌더 매니페스트에 실제로 반영하는 것은 별도 범위로 여전히 남겨둔다 — Timeline UI는 "보기+트림"까지만.
- **전문 비트 트래킹 라이브러리 수준의 정확도**: 에너지 기반 온셋 검출은 스펙트럴 플럭스/복소 도메인 방식보다 약하다 — 타악기가 약한 트랙이나 신스패드 위주 트랙에서 정확도가 떨어질 수 있음을 UI에도 명시한다.
- **Undo/Redo, 멀티 트림 실행취소**: 트림은 즉시 저장되며 되돌리기 UI는 없다(Storyboard 재생성으로 복구 가능).
