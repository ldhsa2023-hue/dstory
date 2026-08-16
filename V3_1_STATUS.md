# VIRAL STUDIO V3.1 IMPLEMENTATION STATUS

세션 완료 시점: 2026-08-16. 이 문서는 실제로 검증된 것만 DONE으로 표시한다.

## Phase 1 — Local Web UI, SQLite, Claude CLI, Channel Profile, Trend Radar, Today Top3, Concept, Hook, Prompt Pack

**상태: DONE**

실제로 로컬에서 다음 흐름 전체를 curl(API)과 Playwright(브라우저) 양쪽으로 검증했다.

```
npm run dev (Next.js 14.2.35, localhost:3000)
→ Settings: SYSTEM STATUS 전부 READY 확인 (Claude CLI / SQLite / Workspace / FFmpeg / FFprobe)
→ Settings: Channel Profile 저장 (SQLite)
→ Trend Radar: SCAN NOW → 실제 Claude CLI(`claude -p --output-format json`, WebSearch/WebFetch 허용) 호출
   → 9개 트렌드 저장, 근거 있는 evidence_confidence/source/risk 포함 (소요 2분 36초)
→ Today: Opportunity×Channel Fit 상위 3개(Primary/Growth/Experiment) 정상 산출
→ Concept Lab: 트렌드 선택 → GENERATE CONCEPTS → 12개 컨셉 생성, Originality Guard(4개 이상 요소 변경) 반영 확인 (1분 56초)
→ APPROVE → Production 자동 생성 (SQLite)
→ Production › HOOK: GENERATE HOOKS → 10개 Hook(6종 이상 유형) 생성, 점수 포함 (43초) → 1개 SELECT
→ Production › PROMPTS: CINEMATIC 모드로 GENERATE → Global Visual Lock + 씬 3개의 ChatGPT 이미지 프롬프트 +
   Higgsfield 영상 프롬프트(8초 클립, continuity/negative constraints 포함) 생성 및 SQLite 저장 (1분 46초)
→ 모든 화면 COPY 버튼 동작 확인
```

전 구간 데이터는 실제 SQLite(`data/viral-studio.sqlite`)에 저장되며, 새로고침 후에도 유지된다.

**Phase 1 범위 밖으로 축소/생략한 것** (README·IMPLEMENTATION_PLAN.md에 명시):
- Trend Scout→...→Editor in Chief 8단계 멀티 에이전트 리서치 파이프라인 → 단일 구조화 Claude 호출로 축약 (최소 50개가 아닌 5~12개 트렌드)
- Story Engine / Storyboard / ChatGPT Prompt Studio / Higgsfield Prompt Studio 4단계 → 하나의 Claude 호출로 압축
- First Run Wizard, Job System(진행 상태 UI), Backup/Export, OPPORTUNITIES 화면 → 미구현

## Phase 2 — Audio Director, Caption Engine, Effect Director, Publish Pack, Policy/QC

**상태: DONE**

Phase 1에서 만든 "빙하 서약자" Production(실제 트렌드→컨셉→훅→프롬프트팩을 거쳐온 것)에 이어서 다음을 curl(API)과 Playwright(브라우저 스크린샷) 양쪽으로 실측 검증했다.

```
Production › AUDIO: GENERATE AUDIO PLAN
  → Music Blueprint(purpose/mood/genre/energy/tempo/BPM/instrumentation/Intro-Build-Peak-Payoff-Outro 구조) +
    Music Master Prompt(외부 음악 생성 AI용) + Music Timeline(스토리보드 실제 씬 길이에 맞춰 0-24s 5구간) +
    SFX Cue Sheet(5개, 시간/타입/강도/이유/볼륨) 생성 및 SQLite 저장 (1분 2초)
Production › CAPTIONS: GENERATE CAPTIONS
  → 9개 자막(HOOK_TEXT/NARRATION/DIALOGUE 혼합, position/animation 포함) + 실제 재생 가능한 SRT/VTT 생성 (23초)
Production › EFFECTS: GENERATE EFFECT TIMELINE (BALANCED)
  → 18개 효과, 전부 purpose(hook/information/emotion/transition/payoff)와 reason 명시, audio_sync 설명 포함 (1분 10초)
Production › PUBLISH: GENERATE PUBLISH PACK
  → 제목 16개(요구한 15개 이상 충족, 상위 3개 UI 노출 + 나머지 접기), Description, Hashtags/Tags,
    썸네일 컨셉 정확히 5개, Instagram 캡션+해시태그(별도 작성, YouTube 설명 재사용 아님), Pinned Comment,
    Policy Review(4개 항목 PASS/REVIEW/BLOCK — 실제로 "반복 콘텐츠 REVIEW"를 정확히 짚어냄),
    AI Disclosure Review(realistic_ai_scene/real_person/viewer_confusion_risk + 추천, 최종 판단은 사용자 몫),
    Content QC(6개 항목 — 실제로 "ending_not_abrupt: REVIEW"를 클리프행어 엔딩에 대해 정직하게 표시) 생성 (1분 27초)
  → APPROVE FINAL (Human Approval Gate) 클릭 → publish_packs.ready_to_publish=true,
    productions.status='READY TO PUBLISH'로 전환 확인. 자동 게시 기능 없음(스펙 63 준수).
```

전 구간 SQLite에 저장되고 새로고침 후 유지됨을 확인했다. 모든 COPY 버튼 동작 확인.

**Phase 2에서 의도적으로 하지 않은 것**:
- "63. HUMAN APPROVAL GATE"는 이 앱에서 아직 실제 렌더링된 영상 파일이 없으므로(Phase 3 미구현) **콘텐츠 패키지(메타데이터) 승인**으로만 구현했다 — "최종 영상 승인"이 아니다. 이는 코드 주석과 UI 문구에 명시했다.
- Final QC(섹션 58)의 기술적 항목(해상도/오디오 클리핑/블랙프레임 등)은 렌더된 파일이 있어야 검사 가능하므로 Phase 3로 미룬다. 대신 Content QC(섹션 62, 기획 수준 QC)만 구현했다.
- Music/SFX 자체 음원 파일은 생성하지 않는다(스펙 27 자동화 경계 준수) — 프롬프트와 큐시트만 생성한다.

## Phase 3 — Asset Manager, FFmpeg 기반 Post Studio, Preview/Final Render

**상태: DONE**

실제 파일 업로드부터 재생 가능한 MP4 출력까지 curl(API), 독립 ffprobe 검증, 프레임 추출 육안 확인, Playwright 브라우저 스크린샷으로 실측했다. (실제 Higgsfield 클립이 없으므로 ffmpeg의 `color`/`sine` 소스로 8초짜리 합성 테스트 클립 3개(파랑/초록/빨강) + 24초 톤 음악 1개를 만들어 사용 — `webapp/scripts/seed-test-production.mjs`로 Claude 호출 없이 테스트용 Production을 시드했다.)

```
ASSETS 탭: 영상 클립 3개 + 음악 1개 업로드 → ffprobe로 실제 duration/resolution 추출 확인 → 각 클립을 Scene 1/2/3에 연결
RENDER 탭: RENDER PREVIEW (540x960) → 4.3초 만에 완료, 파일 400KB, has_audio=true
  → RENDER FINAL (1080x1920 @30fps) → 7초 만에 완료
  → 출력 파일을 독립적으로 ffprobe 재검증(우리 리포트와 별개로 duration/해상도/코덱 일치 확인)
  → t=1s/9s/17s 프레임을 직접 추출해 육안 확인: Scene 순서(파랑→초록→빨강)와 한글 자막 하드섭("테스트 훅 텍스트"
    "전개 자막" "반전의 순간")이 정확한 타이밍에 정확히 렌더링됨을 확인
  → silencedetect로 배경음악이 무음 없이 믹스되었음을 확인
  → 브라우저에서 <video> 플레이어로 실제 재생 가능함을 스크린샷으로 확인
```

**보안 검증**:
- 허용되지 않은 MIME 타입(application/x-msdownload) 업로드 → 415 거부 확인
- 파일명에 `../../../etc/passwd_pwned.mp4` 같은 path traversal 문자열을 넣어도 저장 경로는 항상 `{assetId}.{ext}`로 고정되어 영향 없음을 확인 (원본 파일명은 표시용으로만 sanitize 후 보관)
- FFmpeg는 항상 `execFile`에 인자 배열로 전달되고 shell을 거치지 않음 — 파일 경로에 어떤 문자가 들어와도 명령 주입 불가능한 구조

**실패 복구 검증**:
- Scene 2에 연결된 클립을 해제하고 렌더 → 크래시 없이 COMPLETED, 경고 메시지("Scene 2에 연결된 영상 클립이 없습니다")와 함께 나머지 2개 클립(16초)만으로 렌더됨을 확인
- 클립 파일을 텍스트로 손상시킨 뒤 렌더 → FFmpeg 실패를 포착해 Job을 FAILED로 표시(서버 크래시 없음), 이후 API가 정상 응답하는지 확인, 파일 복구 후 재렌더 → COMPLETED로 정상 복구됨을 확인

**Phase 3에서 의도적으로 단순화한 것**:
- Effect Track(효과 타임라인)에 있는 효과는 아직 렌더에 적용하지 않는다 — 렌더 리포트에 "N개 효과가 있지만 적용하지 않음(SIMPLIFIED)"으로 명시. Punch Zoom/Speed Ramp 등은 다음 단계 과제.
- 원본 클립의 오디오 트랙은 사용하지 않는다 — 배경음악(또는 없으면 무음)만 최종 오디오로 사용한다. Higgsfield 클립은 보통 오디오가 없거나 부수적이라는 전제하의 의도적 단순화.
- 트랜지션은 하드컷만 지원한다 (크로스페이드/휩 트랜지션 등은 미구현).
- Job Queue는 비동기 상태 폴링(QUEUED→RUNNING→...) 없이 동기 실행이다 — 로컬 단일 사용자, 짧은 클립 기준으로는 문제없지만 스펙이 말하는 완전한 Job 시스템은 아니다.
- 자동화된 테스트 스위트(코드화된 unit/integration test)는 작성하지 않았다 — 이번 검증은 실제 서버 구동 + curl + ffprobe + Playwright로 수행한 수동/스크립트 검증이다.

## Phase 4 — Analytics, Channel DNA, Format Fatigue, Prompt Learning

**상태: NOT STARTED**

## V3.2 (Auto Edit Director / Media Analysis / FFmpeg 편집 자동화)

**상태: NOT STARTED**

V3.2는 V3.1의 Production 파이프라인(특히 Phase 3 Asset Manager)이 실제 업로드된 Higgsfield 클립을 다루는 것을 전제로 하므로, Phase 3 이후에 착수하는 것이 순서에 맞다.

## 테스트

- 자동화된 테스트 스위트(ffprobe parser, schema validation 등)는 **아직 작성하지 않았다** (NOT STARTED). 이번 세션은 실제 서버 구동 + curl + Playwright 스크린샷으로 수동/스크립트 검증했다.

## 알려진 제약

- `node:sqlite`는 Node 실험적 기능 (Node ≥22.5 필요).
- Claude CLI subprocess 호출은 무거운 작업 기준 1~3분 소요된다 (트렌드 조사가 가장 김).
- 기존 프로토타입(트렌드 기록 CSV형 3페이지 도구)은 삭제하지 않고 `app/_legacy_*`, `lib/_legacy_*`로 이동해 라우팅에서만 제외했다.

## 실행 명령

```bash
cd webapp
npm install
npm run dev
# http://localhost:3000
```

---

**VIRAL STUDIO V3.1 — PHASE 1, PHASE 2, PHASE 3 READY.** Phase 4와 V3.2는 아직 준비되지 않았다.
