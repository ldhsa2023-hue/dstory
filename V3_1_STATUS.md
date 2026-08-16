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

**VIRAL STUDIO V3.1 — PHASE 1, PHASE 2 READY.** Phase 3~4와 V3.2는 아직 준비되지 않았다.
