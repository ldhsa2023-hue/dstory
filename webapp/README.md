# Viral Studio V3.1 (Phase 1)

로컬에서 실행되는 AI 콘텐츠 제작 운영 시스템. Trend Intelligence → Concept → Hook → ChatGPT/Higgsfield Prompt Pack까지, 실제 Claude Code CLI를 AI 백엔드로 사용해 자동 생성한다. 이미지·영상 생성 자체(ChatGPT/Higgsfield 호출)는 자동화하지 않으며, 생성된 프롬프트를 사용자가 직접 복사해 사용한다.

이 문서는 저장소 루트의 `IMPLEMENTATION_PLAN.md`(분석·아키텍처 결정·Phase 계획)와 함께 읽는다.

## 사전 준비

1. **Node.js ≥ 22.5** — `node:sqlite`(experimental)를 사용하므로 필요.
2. **Claude Code CLI** — 이 앱은 서버에서 `claude -p ...`를 subprocess로 호출한다. `claude`가 PATH에 있고 이미 로그인되어 있어야 한다 (`claude --version`으로 확인). 감지되지 않으면 각 화면은 자동 실행 대신 "복사해서 직접 실행" 모드로 전환된다.
3. **FFmpeg / FFprobe** — Phase 3(Post Studio 렌더링)부터 필요. Phase 1에는 필요 없다.

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

## 아키텍처

| 구성 | 내용 |
|---|---|
| DB | `node:sqlite` (`data/viral-studio.sqlite`, git 추적 제외) — ChannelProfile, ResearchRun, Trend, Concept, Hook, Production, PromptPack |
| AI Engine | `lib/ai/engine.js` — `ClaudeCLIEngine`(기본, `claude -p --output-format json` subprocess) / `ManualEngine`(fallback, 프롬프트만 생성) |
| 프롬프트 빌더 | `lib/prompts/{trendResearch,conceptLab,hookEngine,promptStudio}.js` |
| 채점 로직 | `lib/scoring.js` — Channel Fit Score, Today Top3 랭킹, Higgsfield 모델 카탈로그 |

Claude 호출은 항상 구조화된 JSON 스키마를 요청하고, 파싱 실패 시 1회 자동 재시도(validation feedback 포함)한다. Trend Radar 조사에만 `WebSearch`/`WebFetch` 도구 접근을 허용하고, 나머지(Concept/Hook/Prompt 생성)는 도구 접근 없이 순수 텍스트 생성만 수행한다.

## 이전 프로토타입과의 관계

이 프로젝트 이전에 존재했던 3페이지짜리 JSON-파일 기반 도구(트렌드 기록 → 씬 프롬프트 → Higgsfield 프롬프트)는 삭제하지 않고 `app/_legacy_*`, `lib/_legacy_*` 로 이동해 라우팅에서만 제외했다(Next.js는 `_`로 시작하는 폴더를 라우트로 인식하지 않는다). 코드는 그대로 저장소에 남아 있다.

## 알려진 제약 (정직하게 기록)

- **`node:sqlite`는 Node의 실험적 기능**이다. Node 버전이 바뀌면 동작이 달라질 수 있다.
- **Trend Radar 조사는 8단계 멀티 에이전트 파이프라인(Trend Scout→...→Editor in Chief)의 축약판**이다. 단일 구조화 Claude 호출로 보통 5~12개 트렌드를 찾는다(스펙이 요구하는 "최소 50개 시그널"에는 못 미친다).
- **Story Engine·Storyboard·ChatGPT Prompt Studio·Higgsfield Prompt Studio가 하나의 생성 단계로 압축**되어 있다. 스펙은 이를 별도 화면으로 나누지만, Phase 1에서는 하나의 Claude 호출로 처리한다.
- **Phase 2(Audio/Caption/Effect/Publish Pack), Phase 3(Asset Manager/FFmpeg Post Studio/Render), Phase 4(Analytics/Channel DNA)는 아직 구현되지 않았다.** 자세한 내용은 저장소 루트의 `V3_1_STATUS.md` 참고.
- **Claude CLI subprocess 호출은 느리다** (트렌드 조사 ~2-3분, 컨셉/훅/프롬프트 생성 각 1-2분). 웹 요청 타임아웃을 길게 잡아두었다.
