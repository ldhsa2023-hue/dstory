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

**상태: NOT STARTED**

## Phase 3 — Asset Manager, FFmpeg 기반 Post Studio, Preview/Final Render

**상태: NOT STARTED**

이 세션에서 이 컨테이너에 ffmpeg/ffprobe를 설치하고 subprocess 호출이 가능함은 확인했지만, 실제 업로드→타임라인→렌더 기능은 아직 코드가 없다. (사용자 로컬 환경에 ffmpeg가 있다는 보장도 없으므로 Settings의 SYSTEM STATUS에서 사전 체크만 구현되어 있다.)

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

**VIRAL STUDIO V3.1 — PHASE 1 READY.** Phase 2~4와 V3.2는 아직 준비되지 않았다.
