# Viral Studio V3.1 (Phase 1-4) + V3.2 Phase A + Google Flow Provider Patch

로컬에서 실행되는 AI 콘텐츠 제작 운영 시스템. Trend Intelligence → Concept → Hook → ChatGPT/Higgsfield Prompt Pack까지, 실제 Claude Code CLI를 AI 백엔드로 사용해 자동 생성한다. 이미지·영상 생성 자체(ChatGPT/Higgsfield 호출)는 자동화하지 않으며, 생성된 프롬프트를 사용자가 직접 복사해 사용한다.

이 문서는 저장소 루트의 `IMPLEMENTATION_PLAN.md`(분석·아키텍처 결정·Phase 계획)와 함께 읽는다.

## 사전 준비

1. **Node.js ≥ 22.5** — `node:sqlite`(experimental)를 사용하므로 필요.
2. **Claude Code CLI** — 이 앱은 서버에서 `claude -p ...`를 subprocess로 호출한다. `claude`가 PATH에 있고 이미 로그인되어 있어야 한다 (`claude --version`으로 확인). 감지되지 않으면 각 화면은 자동 실행 대신 "복사해서 직접 실행" 모드로 전환된다.
3. **FFmpeg / FFprobe** — Phase 3(에셋 업로드 시 기술 메타데이터 추출, Post Studio 렌더링)부터 필요. Phase 1~2에는 필요 없다. `ffmpeg -version` / `ffprobe -version`으로 확인하거나 Settings의 SYSTEM STATUS를 본다.

## 실행

```bash
cd webapp
npm install
npm run dev
```

`http://localhost:3000` → Settings에서 SYSTEM STATUS를 확인하고 Channel Profile을 입력한 뒤 시작한다.

## Phase 1 워크플로우 (실제 동작 확인됨)

```
SETTINGS: Channel Profile 저장
  → TREND RADAR: SCAN NOW (Claude + WebSearch로 실시간 트렌드 조사, ~2-3분)
  → TODAY: Opportunity×Channel Fit 상위 3개 확인
  → CONCEPT LAB: 트렌드 선택 → GENERATE CONCEPTS (10개+, Originality Guard 적용)
  → APPROVE → PRODUCTION 자동 생성
  → PRODUCTION › HOOK 탭: GENERATE HOOKS (10개+) → 하나 SELECT
  → PRODUCTION › PROMPTS 탭: STABLE/CINEMATIC/VIRAL 모드 선택 → GENERATE
     → Global Visual Lock + 씬별 ChatGPT 이미지 프롬프트 + Higgsfield 영상 프롬프트(8초 클립 기준)
  → 각 프롬프트를 COPY해서 ChatGPT / Higgsfield에 직접 붙여넣어 사용
```

## Phase 2 워크플로우 (실제 동작 확인됨)

Prompt Pack까지 만든 Production에서 이어서 진행한다.

```
PRODUCTION › AUDIO 탭: GENERATE AUDIO PLAN
  → Music Blueprint(무드/장르/BPM/Intro-Build-Peak-Payoff-Outro 구조) + 외부 음악 생성 AI용 Music Master Prompt
  → Storyboard 실제 씬 길이에 맞춘 Music Timeline + SFX Cue Sheet (음원 파일 자체는 생성하지 않음)
PRODUCTION › CAPTIONS 탭: GENERATE CAPTIONS
  → HOOK_TEXT/NARRATION/DIALOGUE 등 자막 타임라인 + 바로 쓸 수 있는 SRT/VTT
PRODUCTION › EFFECTS 탭: Effect Budget(LOW/BALANCED/HIGH_ENERGY) 선택 → GENERATE EFFECT TIMELINE
  → 모든 효과에 purpose(hook/information/emotion/transition/payoff)와 reason이 반드시 있어야 함
PRODUCTION › PUBLISH 탭: GENERATE PUBLISH PACK
  → 제목 15개+ (상위 3개만 우선 노출) · Description · Hashtags/Tags · 썸네일 컨셉 5개
  → Instagram 캡션(YouTube 설명과 별도) · Pinned Comment
  → Policy Review(정책/저작권/오도성 메타데이터/반복 콘텐츠) + AI Disclosure Review + Content QC
  → APPROVE FINAL (Human Approval Gate) — 자동 게시 없음. 실제 업로드는 사용자가 직접 진행.
```

## Phase 3 워크플로우 (실제 동작 확인됨)

```
PRODUCTION › ASSETS 탭: Higgsfield에서 실제로 생성한 영상 클립(mp4/mov/webm) 업로드
  → 업로드 즉시 ffprobe로 실제 duration/해상도/코덱 추출 (추측하지 않음)
  → 각 클립을 Scene 1/2/3...에 연결. 음악(mp3/wav/m4a/aac)도 별도 업로드
PRODUCTION › RENDER 탭: PREVIEW(540x960, 빠른 인코딩) 또는 FINAL(1080x1920, 고품질) 선택 → RENDER
  → Scene 순서대로 클립을 이어붙이고(하드컷) · 9:16(또는 16:9)로 스케일/크롭 ·
    CAPTIONS 탭에서 만든 자막을 하드섭으로 삽입 · 배경음악을 페이드인/아웃과 함께 믹스
  → 완료되면 브라우저에서 바로 재생 가능한 MP4 + 렌더 리포트(해상도/길이/코덱/용량/렌더시간/경고) 표시
```

`webapp/scripts/seed-test-production.mjs`로 Claude 호출 없이 테스트용 Production을 만들고, ffmpeg의 `color`/`sine` 소스로 합성한 테스트 클립을 업로드해 렌더 파이프라인 전체(업로드 → 링크 → PREVIEW/FINAL 렌더 → 프레임 추출 검증 → 실패 복구)를 실측 검증했다. 자세한 내용은 `V3_1_STATUS.md`.

## V3.2 워크플로우 — Auto Edit Director (실제 동작 확인됨)

```
PRODUCTION › ANALYZE 탭: ANALYZE ALL
  → 연결된 클립마다: FFprobe 확장 분석(비트레이트/오디오코덱/회전 등) → PASS/WARNING/FAIL 판정
  → ffmpeg scene-score/silencedetect로 실제 컷·무음 지점 감지 (VISUAL_CHANGE_SIGNAL — 픽셀 변화일 뿐 "장면 이해"라고 주장하지 않음)
  → 키프레임 5장 + 감지된 컷 지점 추출 → Contact Sheet 생성
  → ClaudeVisualProvider가 `claude -p --allowedTools Read`로 Contact Sheet 파일을 실제로 읽고 묘사
    (Claude CLI 미감지 시 ManualVisualProvider로 전환 — 사람이 Contact Sheet를 직접 검토)
PRODUCTION › AUTO EDIT 탭: Intensity(MINIMAL/BALANCED/AGGRESSIVE) 선택 → GENERATE EDIT
  → Hook Readiness Score(투명 공식, 학습 모델 아님) 산출
  → Claude에게 실측 Signal Map만 제공해 EditDecision(Cut/Punch Zoom/Transition/SFX Cue 등) 생성
    — 모든 결정은 실제 signalId를 인용해야 하며, 근거가 약하면 confidence를 스스로 LOW로 낮춤
```

이 클립이 실제로는 아무 콘텐츠 없는 단색 테스트 영상임에도 Claude가 "solid, uniform blue/green/red" 로 정확히 묘사하고 스스로 BAD_FRAME 이슈를 표시했다 — 보지 못한 내용을 추측하지 않는다는 원칙이 실제로 지켜짐을 확인했다. 자세한 내용은 `V3_1_STATUS.md`의 V3.2 섹션과 `IMPLEMENTATION_PLAN.md`의 축소 범위 설명 참고.

## V3.2 나머지 범위 — TIMELINE 탭 / Beat Sync (실제 동작 확인됨)

```
PRODUCTION › AUDIO 탭: MUSIC 자산 업로드 후 ANALYZE BEAT 클릭
  → ffmpeg로 mono PCM 디코드 + 로컬 에너지 기반 온셋 검출/BPM 추정(외부 라이브러리 없음)
  → 실측 BPM/Confidence/온셋 수를 Claude가 추정한 blueprint.bpm_range와 나란히 표시
    (실측이 추정을 조용히 덮어쓰지 않음)
PRODUCTION › TIMELINE 탭(신규):
  → CLIPS/SIGNALS/EDIT DECISIONS/BEAT 4개 트랙을 줌 가능한 가로 타임라인에 표시
  → 트랙별 표시/숨김 체크박스, 클립 오른쪽 가장자리 드래그로 씬 길이(duration_sec) 트림
    → 이후 씬들이 자동으로 재배치됨 (씬 순서 재배열은 지원하지 않음)
```

Beat Analyzer는 ffmpeg `aevalsrc`로 합성한 120 BPM/90 BPM 클릭 트랙으로 정확도를 검증했고(둘 다 오차 1 BPM 이내로 정확히 검출), 완전 무음에서는 BPM을 산출하지 않고 정직하게 "산출 안 됨"을 반환하는 것도 확인했다. Timeline 드래그 트림은 Playwright로 실제 마우스 드래그 후 페이지를 하드 리로드해 SQLite에 실제로 저장됐는지까지 확인했다 — 이 검증 과정에서 무음 온셋 오검출 버그와 트림 저장 시 stale closure로 조용히 저장 안 되던 버그를 각각 발견해 수정했다. 자세한 내용은 `V3_1_STATUS.md`의 "V3.2 나머지 범위 — Timeline UI + Beat Sync" 섹션과 `V32_TIMELINE_BEATSYNC_PLAN.md` 참고.

## Edit Plan → 렌더러 자동 연동 (실제 동작 확인됨)

```
PRODUCTION › AUTO EDIT 탭에서 Edit Plan을 생성해두면 RENDER 탭에서 RENDER 버튼을 누를 때
자동으로 반영된다 — 별도 설정 불필요:
  PUNCH_ZOOM/MICRO_ZOOM/PAYOFF_EMPHASIS → 구간 확대(scale+crop)
  SPEED_RAMP → 구간 배속(setpts)
  FREEZE → 구간 정지(tpad)
  TRIM → 구간 삭제(concat에서 제외)
  HOOK_TEXT_TIMING → 선택된 Hook 텍스트를 drawtext로 오버레이(한글 폰트 자동 탐색)
CUT/TRANSITION/IMPACT_SFX_CUE/MUSIC_CUE/LOOP_SUGGESTION 등은 필터가 불안정하거나(xfade)
실제 매칭 자산이 없어 여전히 적용하지 않으며, RENDER 탭에 "EDIT PLAN 적용 결과 (N/M개 적용)"로
각 결정이 적용/미적용됐는지와 그 이유가 그대로 표시된다.
```

합성 테스트 클립(패턴+타임스탬프 오버레이)에 각 타입을 하나씩 넣은 EditPlan으로 실제 렌더를 실행해 검증했다: 출력 길이가 TRIM/SPEED_RAMP 반영분만큼 정확히 줄어든 것을 ffprobe로, PUNCH_ZOOM이 실제로 확대된 프레이밍인지를 프레임 추출로, SPEED_RAMP이 정확히 1.5배속인지를 소스/출력 타임스탬프 델타 비율 계산으로, FREEZE 구간 두 지점이 완전히 동일한 프레임인지를 직접 대조로 확인했다. 이 과정에서 시스템 기본 폰트에 한글 글리프가 없어 HOOK_TEXT_TIMING이 빈 화면으로 렌더링되는 버그와, 고정 폰트 크기가 PREVIEW 캔버스에서 화면 밖으로 잘려나가는 버그를 발견해 각각 크로스플랫폼 폰트 탐색(`lib/render/fontResolver.js`)과 캔버스 비례 폰트 크기로 수정했다. Edit Plan이 없는 Production은 패치 이전과 완전히 동일한 필터 그래프로 렌더링됨을 확인해 회귀가 없음도 검증했다. 자세한 내용은 `V3_1_STATUS.md`의 "Edit Plan → 렌더러 자동 연동" 섹션과 `EDIT_PLAN_RENDERER_INTEGRATION_PLAN.md` 참고.

## Phase 4 워크플로우 — Analytics / Channel DNA (실제 동작 확인됨)

```
PRODUCTION › PERFORMANCE 탭: 실제 YouTube/Instagram 수치를 수동 입력 (또는 CSV Import)
  → 저장 시 Production 상태가 PUBLISHED로 전환, 입력 안 한 값은 UNKNOWN으로 남음 (추측하지 않음)
PRODUCTION › ASSETS 탭: 각 클립의 Generation Outcome(SUCCESS/RETAKE/FAIL + 사유)을 직접 기록
  → Higgsfield 생성은 앱 밖에서 일어나므로, 결과는 항상 사용자가 보고한 실제 값
CHANNEL DNA 페이지 (신규 상단 메뉴):
  → 성과가 입력된 Production이 3개 미만이면 "데이터 부족"을 정직하게 표시 (개수/threshold 그대로 노출)
  → 3개 이상이면 Best Hook Type / Best Genre / Retention Driver(Hook·Music) / Top Performers를 실제 평균으로 계산
  → Format Fatigue: 최근 5개 Production의 실제 저장된 장르/Hook 타입이 3개 이상 겹치면 경고 (성과 데이터 불필요)
  → Prompt Library: SUCCESS로 기록된 클립에 연결된 Scene의 실제 Higgsfield 프롬프트만 모아서 표시
```

이 로컬 환경에는 실제 게시 성과가 없으므로, `webapp/scripts/seed-phase4-test-data.mjs`로 명확히 "[TEST]"라고 표시된 테스트 Production 2개(성과 포함)를 만들어 "데이터 부족" 상태와 "충분한 데이터" 상태 양쪽을 모두 검증했다. 자세한 내용은 `V3_1_STATUS.md`.

## Google Flow / Veo Video Provider 워크플로우 (실제 동작 확인됨)

```
PRODUCTION › PROMPTS 탭: VIDEO GENERATION PROVIDER에서 Higgsfield / Google Flow / Generic 선택
  → Higgsfield를 최소 1회 먼저 실행해 Storyboard를 확보해야 함 (모든 Provider가 이 Storyboard를 공유 —
    Story를 다시 생성하지 않음. Storyboard 없이 Google Flow/Generic 생성 시도 시 400 에러로 안내)
  → Google Flow 선택 시 Generation Mode(Auto Recommend / Image→Video / Start+End Frame /
    Ingredients / Text→Video) + Audio Intent 선택 후 GENERATE
  → 클립별로 recommended_mode + mode_reason(Claude가 스토리 맥락을 보고 판단한 근거 서술),
    Start/End Frame Prompt + Motion Bridge Prompt(모드가 start-end-frame일 때) 또는
    단일 Flow Prompt(image-to-video/text-to-video일 때), Continuity Notes, Negative
    Constraints, Complexity Warning을 표시
  → 각 프롬프트를 COPY해서 Google Flow/Veo에 직접 붙여넣어 사용 (자동 업로드/실행 없음)
  → 클립 카드의 GENERATION STEPS 체크박스(Start Frame/End Frame/Video)로 어디까지 작업했는지
    수동으로 표시 (Google Flow/Veo에서 실제로 그 단계를 완료했다고 스스로 체크하는 트래커)
  → VERSION HISTORY에서 동일 Provider로 재생성한 과거 버전(v1, v2, ...)을 모두 조회 가능,
    ★로 Winner 버전 표시 + "Winner만 보기" 필터
PRODUCTION › ASSETS 탭: REFERENCE_IMAGE/GENERATED_IMAGE에 Ingredient 체크 + 이름 + 타입
  (CHARACTER/FOOD/OBJECT/...) 태깅 → Ingredients 모드로 생성 시 해당 이름이 프롬프트
  컨텍스트로 전달되어 클립의 ingredients_used에 실제로 반영됨 (하드코딩이 아님)
  → VIDEO_CLIP의 Generation Outcome 기록 시 Provider도 함께 선택 → CHANNEL DNA의
    Provider Performance 집계에 사용됨
SETTINGS 페이지: Default Video Provider 지정 시 새로 승인되는 Production에 자동 반영
CHANNEL DNA 페이지: PROVIDER PERFORMANCE 카드 — Provider별 Generation Outcome이
  3건 이상 쌓이면 실제 성공률(SUCCESS/전체)을 계산, 미달이면 "데이터 부족"을 정직하게 표시
PROMPTS 탭의 EXPORT MD / EXPORT JSON 버튼: 현재 보고 있는 버전의 프롬프트를
  google-flow-prompts-v{N}.md/json 파일로 다운로드 (이 앱 자체의 로컬 내보내기 —
  Google Flow/Higgsfield 자동화가 아님)
PROMPTS 탭의 COMPARE PROMPTS 버튼: Higgsfield/Google Flow/Generic 각 Provider의
  최신 버전을 씬 단위로 3열 나란히 표시해 어떤 Provider가 어떻게 표현했는지 한눈에 비교
Dashboard: Channel Profile 미입력 + Concept/Production 0개인 완전히 새 설치 상태에서만
  4단계 First-Run 안내 카드 표시 (SETTINGS→TREND RADAR→CONCEPT LAB→PRODUCTION),
  실제 데이터가 생기면 자동으로 사라짐
```

Google Flow/Generic 프롬프트는 Higgsfield의 `prompt_pack`과 완전히 분리된 `video_prompts` 테이블에 provider별로 독립 저장되며, `/api/production/prompts/generate`(Higgsfield 전용 경로)는 이 패치에서 한 줄도 수정하지 않았다 — 자세한 검증 내역은 `V3_1_STATUS.md`의 "Google Flow / Veo Video Provider Integration Patch", "Google Flow Patch 4~6", "Google Flow Patch 8" 섹션 참고.

## 아키텍처

| 구성 | 내용 |
|---|---|
| DB | `node:sqlite` (`data/viral-studio.sqlite`, git 추적 제외) — ChannelProfile, ResearchRun, Trend, Concept, Hook, Production, PromptPack, AudioPlan, CaptionTrack, EffectTrack, PublishPack, Asset, RenderJob, MediaAnalysis, EditPlan, PerformanceRecord, VideoPrompts |
| Video Provider | `lib/video/types.js`(공유 vocabulary), `lib/video/providerOrchestrator.js`(google-flow/generic만 라우팅, higgsfield는 기존 경로 그대로), `lib/video/providers/{googleFlowCompiler,genericCompiler}.js`(순수 프롬프트 빌더 함수) |
| AI Engine | `lib/ai/engine.js` — `ClaudeCLIEngine`(기본, `claude -p --output-format json` subprocess) / `ManualEngine`(fallback, 프롬프트만 생성) |
| Visual Provider | `lib/ai/visualProvider.js` — `ClaudeVisualProvider`(`claude -p --allowedTools Read`로 실제 이미지 판독) / `ManualVisualProvider`(fallback) |
| 프롬프트 빌더 | `lib/prompts/{trendResearch,conceptLab,hookEngine,promptStudio,audioDirector,captionEngine,effectDirector,publishPack,autoEditDirector}.js` |
| 채점 로직 | `lib/scoring.js` — Channel Fit Score, Today Top3 랭킹, Higgsfield 모델 카탈로그. `lib/media/hookDetector.js` — Hook Readiness 투명 공식 |
| 미디어/렌더 | `lib/media/{paths,ffprobe,technicalValidation,signalAnalysis,keyframes,analyzeClip,timelineMap}.js`, `lib/render/{manifest,ffmpegCompiler,runner,editApply,fontResolver}.js`(Render Manifest → FFmpeg 인자 배열 → 실행, EditDecision→세그먼트 필터 매핑) |
| Beat Sync | `lib/audio/pcmDecode.js`(ffmpeg → mono f32le PCM), `lib/audio/beatAnalyzer.js`(에너지 기반 온셋 검출 + IOI 히스토그램 BPM 추정 — 외부 라이브러리 없음) |
| Analytics | `lib/analytics/channelDna.js` — 임계값 게이트(≥3건), Best-X 그룹 평균, Format Fatigue, Prompt Library 파생 |

Claude 호출은 항상 구조화된 JSON 스키마를 요청하고, 파싱 실패 시 1회 자동 재시도(validation feedback 포함)한다. Trend Radar 조사에만 `WebSearch`/`WebFetch` 도구 접근을 허용하고, 나머지(Concept/Hook/Prompt 생성)는 도구 접근 없이 순수 텍스트 생성만 수행한다.

FFmpeg는 항상 `execFile`에 인자 **배열**로 전달되며 shell을 거치지 않는다 — 업로드 파일명은 저장 경로 생성에 전혀 쓰이지 않고(`{assetId}.{ext}`로 고정), MIME 타입 allowlist로만 검증한다. 자세한 내용은 `lib/media/paths.js`, `lib/render/ffmpegCompiler.js` 참고.

Claude 호출은 항상 구조화된 JSON 스키마를 요청하고, 파싱 실패 시 1회 자동 재시도(validation feedback 포함)한다. Trend Radar 조사에만 `WebSearch`/`WebFetch` 도구 접근을 허용하고, 나머지(Concept/Hook/Prompt 생성)는 도구 접근 없이 순수 텍스트 생성만 수행한다.

## 이전 프로토타입과의 관계

이 프로젝트 이전에 존재했던 3페이지짜리 JSON-파일 기반 도구(트렌드 기록 → 씬 프롬프트 → Higgsfield 프롬프트)는 삭제하지 않고 `app/_legacy_*`, `lib/_legacy_*` 로 이동해 라우팅에서만 제외했다(Next.js는 `_`로 시작하는 폴더를 라우트로 인식하지 않는다). 코드는 그대로 저장소에 남아 있다.

## 알려진 제약 (정직하게 기록)

- **`node:sqlite`는 Node의 실험적 기능**이다. Node 버전이 바뀌면 동작이 달라질 수 있다.
- **Trend Radar 조사는 8단계 멀티 에이전트 파이프라인(Trend Scout→...→Editor in Chief)의 축약판**이다. 단일 구조화 Claude 호출로 보통 5~12개 트렌드를 찾는다(스펙이 요구하는 "최소 50개 시그널"에는 못 미친다).
- **Story Engine·Storyboard·ChatGPT Prompt Studio·Higgsfield Prompt Studio가 하나의 생성 단계로 압축**되어 있다. 스펙은 이를 별도 화면으로 나누지만, Phase 1에서는 하나의 Claude 호출로 처리한다.
- **Phase 1~4 전부 완료.** V3.2는 Phase A(Media Analysis + Auto Edit Director)만 완료. 자세한 내용은 저장소 루트의 `V3_1_STATUS.md` 참고.
- **Channel DNA 임계값(3)은 통계적 유의성 검정이 아니다** — "이 정도는 있어야 비교가 의미 있다"는 투명한 규칙일 뿐이다.
- **Generation Outcome(SUCCESS/RETAKE/FAIL)은 자동 감지되지 않는다** — Higgsfield 생성은 앱 밖에서 일어나므로 사용자가 직접 기록한다.
- **Publish 탭의 "APPROVE FINAL"은 여전히 콘텐츠 패키지(제목/설명/썸네일 기획/정책 검토) 승인이다.** Render 탭에서 실제 MP4를 만들 수 있게 됐지만, Publish 탭의 승인 버튼과 렌더 완료 여부는 아직 서로 연결되어 있지 않다(수동으로 각각 확인 필요) — 다음 개선 과제.
- **로컬 렌더러는 Effect Track의 효과(Punch Zoom 등)를 적용하지 않는다.** 렌더 리포트에 SIMPLIFIED로 명시하고, 클립 연결·자막 하드섭·배경음악 믹스·화면비 변환·컷 순서만 지원한다. 원본 클립의 오디오는 사용하지 않고 배경음악(또는 무음)만 최종 오디오로 쓴다. 트랜지션은 하드컷만 지원한다.
- **Job Queue는 비동기 폴링 없이 동기 실행이다.** 로컬 단일 사용자·짧은 Shorts 클립 기준으로는 문제없지만, 렌더 요청이 완료될 때까지 API 응답이 대기한다.
- **Claude CLI subprocess 호출은 느리다** (트렌드 조사 ~2-3분, 컨셉/훅/프롬프트 생성 각 1-2분, 클립 분석은 클립당 10~40초). 웹 요청 타임아웃을 길게 잡아두었다.
- **V3.2 Auto Edit Director는 제안만 한다 — 렌더러에 자동 적용되지 않는다.** Edit Plan은 검토용이며, Phase 3 렌더러(RENDER 탭)는 여전히 Effect Track/Edit Plan을 렌더에 반영하지 않는다.
- **Beat Analyzer는 Manual만 지원한다.** 로컬에 신뢰할 만한 BPM/온셋 감지 라이브러리가 없어 실제 비트 검출(`LocalBeatAnalyzer`)은 구현하지 않았다.
- **Timeline UI는 카드/리스트 뷰만 있다.** 드래그·트림·줌이 가능한 풀 캔버스 타임라인 에디터는 없다.
- **Visual Review는 클립당 1회, Contact Sheet 전체를 대상으로 한다.** 개별 키프레임을 프레임 단위로 판독하지 않는다(비용/속도 절충).
