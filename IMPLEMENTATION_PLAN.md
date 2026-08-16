# Viral Studio V3.1 — Implementation Plan

## 0. 실제 현황 분석 (2026-08-16 기준)

이 문서를 쓰기 전 저장소 전체를 조사했다. 결론: **"V3" 또는 "V3.1"에 해당하는 기존 구현은 존재하지 않는다.** 실제로 있는 것은:

```
dstory/
├── strategy/, pipeline/, prompts/, database/, templates/   # 문서·CSV 기반 수동 운영 시스템 (1차 산출물)
└── webapp/                                                  # Next.js 14 로컬 웹앱 (2차 산출물)
    ├── app/{trends,scenes,higgsfield,settings}/page.js       # 3개 기능 페이지 + 대시보드
    ├── app/api/{trends,ideas,scenes,higgsfield,settings}/    # Route Handler (JSON 파일 CRUD)
    ├── lib/db.js                                             # JSON 파일 기반 저장 (SQLite 아님)
    ├── lib/openai.js                                         # OpenAI Chat Completions 직접 호출 (선택적)
    └── lib/prompts/*.js                                      # 프롬프트 템플릿 빌더
```

`webapp/`은 트렌드 기록·채점 → GPT용 씬 프롬프트 생성 → Higgsfield용 JSON 프롬프트 생성까지 3단계를 다루지만, V3.1 스펙과 비교하면:

| V3.1 요구사항 | 현재 상태 |
|---|---|
| SQLite 기반 Entity 모델 | 없음 — JSON 파일 4개(`data/*.json`) |
| Claude CLI를 AI 백엔드로 사용 | 없음 — 선택적으로 OpenAI API 직접 호출(`lib/openai.js`), 스펙의 "자동화하지 않는다: ChatGPT 자체 호출"과 충돌 |
| Channel Profile / Channel Fit Score | 없음 |
| Trend Radar (Stage/Momentum/Evidence) | 없음 — 트렌드는 사람이 수동 입력, 5개 스코어만 존재 |
| Today Top3 | 없음 |
| Concept Lab (원본성 가드 포함) | 없음 — "재해석안" 텍스트 필드만 존재 |
| Hook Engine (10개 후보 + 점수) | 없음 |
| Production 엔티티 / 승인 파이프라인 | 없음 — Trend→Idea→Scene→HiggsfieldRequest 4단계가 있지만 상태 머신 없음 |
| ChatGPT Prompt Studio (Global Visual Lock 등) | 없음 — 씬 텍스트 프롬프트만 있음, 이미지 프롬프트 스튜디오 없음 |
| Higgsfield Prompt Studio (8초 클립 규격) | 부분적 존재 — 모델 추천/JSON 생성은 있으나 8초 단위 규격, Stable/Cinematic/Viral 3모드 없음 |
| Asset Manager / Post Studio / FFmpeg Renderer | 없음 |
| Publish Pack / QC / Analytics / Channel DNA | 없음 |
| Job System, First Run Wizard, Backup/Export | 없음 |

**재사용 가능한 부분**: Next.js 프로젝트 골격, Tailwind 디자인 토큰, `lib/scoring.js`의 Higgsfield 모델 카탈로그·추천 로직, `lib/prompts/*.js`의 씬/Higgsfield 프롬프트 빌더(재구성해서 Prompt Studio에 흡수), UI 컴포넌트(NavBar/CopyButton).

**삭제하지 않는 것**: `strategy/`, `pipeline/`, `prompts/`, `database/`, `templates/` 문서 자산은 그대로 둔다 — Claude 엔진에 넣을 프롬프트 설계 근거로 계속 참조한다. `webapp/`의 기존 3페이지도 삭제하지 않고 V3.1 구조(Trend Radar / Concept Lab / Production 탭)로 흡수·확장한다.

## 1. 이 환경에서 실제로 검증한 사실

- `claude` CLI가 설치되어 있고, `claude -p "<prompt>"` 형태의 non-interactive 호출이 기존 인증으로 정상 동작함을 실측 확인했다 (`{"ok":true,"engine":"claude-cli"}` 왕복 확인). → **ClaudeCLIEngine 채택 가능.**
- `node:sqlite` (Node 22.22.2, experimental) 로 `DatabaseSync`가 정상 동작함을 확인했다. 네이티브 컴파일이 필요한 `better-sqlite3` 대신 이것을 사용해 설치 리스크를 없앤다.
- `ffmpeg`/`ffprobe`는 이 컨테이너에 기본 설치되어 있지 않았으나 `apt-get install ffmpeg`로 설치에 성공했다. **단, 이 앱은 로컬 우선(사용자의 실제 PC) 실행을 전제로 하므로, 최종 사용자 환경에 ffmpeg가 있다는 보장은 없다.** Settings의 SYSTEM STATUS에서 ffmpeg 유무를 체크하고 설치 안내를 표시하는 기능이 필요하다 (Phase 3에서 구현).

## 2. 기술 아키텍처 결정

- **DB**: `node:sqlite` (`DatabaseSync`, 파일 기반 `data/viral-studio.sqlite`). 실험적 기능이지만 네이티브 빌드 불필요, 이 Node 버전에서 안정적으로 동작 확인.
- **AI Engine**: `lib/ai/engine.js`에 `AIEngine` 인터페이스 정의. `ClaudeCLIEngine`(기본, `claude -p` subprocess + JSON 파싱 실패 시 1회 재시도) / `ManualEngine`(fallback, 프롬프트만 반환 — Claude CLI 미검출 시 자동 전환). 기존 `lib/openai.js`(ChatGPT 직접 호출)는 스펙의 자동화 경계와 충돌하므로 제거하고 Claude 엔진으로 대체한다.
- **구조**: V3.1 스펙 75절의 디렉터리 구조를 목표로 하되, Phase 1 범위에 필요한 것만 먼저 만든다 (`lib/ai`, `lib/db`, `lib/scoring`, `lib/prompts`, `app/{dashboard,today,trends,concepts,production,settings}`).

## 3. Phase 계획과 Definition of Done

| Phase | 범위 | DoD |
|---|---|---|
| **1** | SQLite, ChannelProfile, Claude Engine, Trend Radar(Scan), Today Top3, Concept Lab, Hook Engine, Prompt Studio(ChatGPT+Higgsfield), Production 승인 파이프라인 | `npm run dev` → Trend Scan(실제 Claude 호출) → Top3 → Approve → Concept → Hook → Prompt 생성 → SQLite 저장까지 브라우저에서 실제로 동작 |
| **2** | Audio Director, Caption Engine, Effect Director, Publish Pack, Policy/QC 체크리스트 (텍스트/JSON 산출물, 렌더링 없음) | Production에서 Music/Caption/Effect/Publish Pack 생성이 실제 동작 |
| **3** | Asset Manager(업로드), FFmpeg 기반 Post Studio, Preview/Final Render | 실제 클립 업로드 → Timeline → Render → MP4 생성 |
| **4** | Analytics 수동 입력, Channel DNA, Format Fatigue, Prompt Learning | 성과 입력 → DNA 리포트 생성 |

이번 세션에서는 **Phase 1을 실제로 동작하는 상태까지 구현**하고, 완료 후 정직하게 상태를 보고한다 (사용자 지시: "단계마다 결과 보고"). Phase 2~4와 V3.2(Auto Edit Director)는 Phase 1이 실제 검증된 뒤 후속 세션에서 진행한다.

## 4. 리스크

- **`node:sqlite`는 experimental** — Node 버전이 바뀌면 API가 변경될 수 있음. package.json에 Node 버전을 명시하고 README에 경고를 남긴다.
- **Claude CLI 서브프로세스 비용/속도** — 웹 요청마다 `claude -p`를 호출하면 응답 지연(수 초~수십 초)과 사용량이 발생한다. Trend Scan처럼 무거운 작업에만 사용하고, 결과는 반드시 DB에 캐시한다.
- **ffmpeg는 사용자 로컬 환경 의존** — Phase 3부터 필요. Settings의 SYSTEM STATUS에서 사전 확인하고, 없으면 기능을 비활성화하며 설치 링크를 안내한다(Phase 3에서 구현).
- **8단계 Research Multi-Agent 파이프라인(Trend Scout→...→Editor in Chief) 전체 구현은 이번 Phase 1 범위 밖** — 대신 단일 구조화 Claude 호출로 트렌드 후보(최대 12개, "최소 50개"에는 못 미침)를 생성하고 이 사실을 명시한다. 추후 세션에서 멀티 에이전트로 확장 가능하도록 인터페이스를 분리해둔다.

---

# V3.2 — Auto Edit Director: Implementation Plan

Phase 1~3(V3.1)가 실제로 동작하는 상태로 검증된 뒤 착수한다. V3.2는 V3.1의 Asset Manager(Phase 3)가 이미 실제 업로드된 클립을 다룰 수 있어야 성립하므로, 순서상 지금이 맞다.

## 이 세션에서 실측 확인한 새로운 사실

`claude -p "<프롬프트>" --allowedTools Read`로 로컬 이미지 파일을 실제로 읽고 시각적으로 정확히 묘사할 수 있음을 실측했다 (합성 이미지에 적어넣은 "TEST FRAME 42" 텍스트를 정확히 읽어냄). 즉 스펙 9절의 `VisualAnalysisProvider` 인터페이스에서 **`ClaudeVisualProvider`가 실제로 안정적으로 동작한다** — 이전 계획서에 적어둔 "이미지 분석이 안정적으로 가능한 경우에만" 조건을 충족한다. Manual 폴백은 Claude CLI 미감지 시에만 사용한다.

## V3.2 Phase A 범위 (이번 세션에서 실제로 구현)

전체 스펙(114개 항목 — Media Analysis, Auto Edit Director, Music/Beat Sync, Timeline UI, Render Compiler, Learning, 4개 Claude Agent, 10개 Skill, Job Queue, 자동 테스트 등)을 한 세션에 전부 구현하는 것은 비현실적이다. Phase 1~3과 동일한 원칙으로 **실제로 측정한 데이터에서만 작동하는 핵심 파이프라인**을 골라 구현한다.

| 구현 | 실제 측정 방식 |
|---|---|
| FFprobe 확장 분석 + Technical Validation(PASS/WARNING/FAIL) | ffprobe 실측치 기반, 추측 없음 |
| Scene Signal (VISUAL_CHANGE_SIGNAL) | ffmpeg `select='gt(scene,τ)'` 필터 실측 — "의미 분석"이 아니라 "픽셀 변화 신호"임을 명시 |
| Audio Signal (silence/volume) | ffmpeg `silencedetect`/`volumedetect` 필터 실측 |
| Keyframe 추출 + Contact Sheet | ffmpeg 실제 프레임 추출 (0/25/50/75/100% + scene change 지점) |
| Visual Review | `ClaudeVisualProvider` — 실제 keyframe 이미지를 Claude가 Read tool로 읽고 묘사 |
| Timeline Signal Map | 위 신호들을 클립 순서대로 오프셋 합산 — 전부 timestamp/type/strength/source/confidence 포함 |
| Hook Detector | 0~3초 구간을 0.5초 단위로 나눠 실측 신호 밀도 계산 + 첫 keyframe의 Claude 시각 묘사 → 투명한 수식으로 Hook Readiness Score 산출 |
| Auto Edit Director | Claude에게 **실측 Signal Map + Storyboard + Hook + Caption/Effect Track**만 제공하고, 그 안에서만 EditDecision(JSON, time/endTime/track/type/parameters/reason/signalIds/confidence)을 만들게 지시 — 측정되지 않은 타임스탬프를 만들지 말라고 명시적으로 강제 |

## 이번 세션에서 하지 않는 것 (정직하게 기록)

- **Beat Analyzer**: `BeatAnalysisProvider` 인터페이스는 만들지만 `LocalBeatAnalyzer`(실제 BPM/온셋 감지)는 구현하지 않는다 — 로컬에 설치된 신뢰할 만한 비트 검출 라이브러리가 없다. `ManualBeatMarker`만 제공한다.
- **Timeline UI(드래그/트림/줌/트랙 뮤트 등 풀 에디터)**: 이번엔 Edit Plan을 리스트/카드로 보여주는 데 그친다. 실제 드래그 가능한 타임라인 캔버스는 다음 과제.
- **Auto Loop Engine, Speed Ramp 실제 렌더 적용, A/B Edit, Lock System, 버전 관리(v1/v2/v3)**: Edit Plan은 생성하지만 Phase 3 렌더러에 자동으로 연결해 적용하지는 않는다 (Phase 3 렌더러는 여전히 Effect Track을 SIMPLIFIED로 건너뛴다는 기존 원칙 유지).
- **`.claude/agents/*.md` 4종, `/analyze-media` 등 10개 Skill**: 이 웹앱은 자체 API Route로 동일한 기능을 이미 제공하므로, Claude Code 세션 전용 Agent/Skill 파일은 이번 범위에서 생성하지 않는다.
- **자동화된 코드 테스트 스위트**: 여전히 실제 서버 구동 + curl + ffprobe/프레임 검증 방식으로만 검증한다.
