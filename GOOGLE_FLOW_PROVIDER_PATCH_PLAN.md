# Google Flow / Veo Provider Integration — Patch Plan

## 1. 현재 영상 생성 아키텍처 (패치 전)

```
Production.storyboard (scene_number/duration_sec/purpose)
        ↑ 생성
buildPromptPackPrompt(concept, hook, profile, higgsfieldMode)   [lib/prompts/promptStudio.js]
        ↓ 단일 Claude 호출
POST /api/production/prompts/generate                          [Storyboard + Higgsfield 프롬프트를 한 번에 생성]
        ↓ 저장
prompt_packs { global_visual_lock, image_prompts[], higgsfield_prompts[], higgsfield_mode }
        ↓ UI
PRODUCTION › PROMPTS 탭 (STABLE/CINEMATIC/VIRAL 모드 선택 → 생성 → 카드로 표시 + COPY)
```

**핵심 특징**: Storyboard 생성과 Higgsfield 프롬프트 생성이 하나의 Claude 호출에 묶여 있다. Provider가 Higgsfield 하나뿐이었기 때문에 문제가 없었다.

## 2. 재사용 가능한 컴포넌트

- `production.storyboard` — 이미 Single Source of Truth로 저장되어 있다. 그대로 재사용한다.
- `prompt_packs.global_visual_lock` — 있으면 그대로 재사용(캐릭터/월드/스타일 고정), 없으면 Google Flow 컴파일러가 자체적으로 하나 만든다.
- `lib/ai/engine.js` (ClaudeCLIEngine/ManualEngine) — 그대로 재사용.
- `assets` 테이블, Asset Manager UI — Ingredient 필드만 추가, 구조는 그대로.
- `COPY 버튼(components/CopyButton.js)`, 탭 UI 패턴 — 그대로 재사용.

## 3. 절대 규칙 준수 방법

- **`lib/prompts/promptStudio.js`, `app/api/production/prompts/generate/route.js`는 이번 패치에서 단 한 줄도 수정하지 않는다.** Provider가 `higgsfield`(기본값)일 때 PROMPTS 탭은 지금과 완전히 동일하게 동작한다.
- 새 Provider(Google Flow, Generic)는 **기존 Storyboard가 이미 존재해야 실행 가능**하다 — Story/Storyboard를 다시 만들지 않고, 있는 Storyboard를 다른 방식으로 "번역"만 한다(스펙 37절 "DO NOT DUPLICATE STORY LOGIC" 그대로 준수). Storyboard가 없으면 UI가 "먼저 PROMPTS 탭에서 Storyboard를 생성하세요"라고 안내한다.
- 각 Provider는 완전히 분리된 파일의 완전히 분리된 프롬프트 빌더를 쓴다. 공유 코드는 입력 데이터(storyboard/concept/hook)뿐이다.

## 4. Provider 추상화 설계

```
lib/video/
  types.js                    # VIDEO_PROVIDERS, GENERATION_MODES 상수
  providerOrchestrator.js     # provider 이름 → 컴파일러 매핑만 담당 (얇은 라우터)
  providers/
    higgsfieldAdapter.js      # 기존 promptStudio.js를 그대로 호출하는 얇은 어댑터 (로직 복제 없음)
    googleFlowCompiler.js     # 신규: 자연어 Flow 프롬프트 생성
    genericCompiler.js        # 신규: Vendor-neutral 구조화 프롬프트 생성
```

`providerOrchestrator.js`는 새 Provider(Google Flow/Generic) 요청만 라우팅한다. Higgsfield는 기존 UI가 기존 API 라우트를 그대로 호출하므로 오케스트레이터를 거치지 않아도 된다 — 이렇게 하면 리팩터링으로 인한 회귀 리스크가 구조적으로 0이 된다.

## 5. DB 마이그레이션

```sql
-- productions: Provider override (Channel 기본값은 channel_profile.data JSON 안에 저장, 스키마 변경 불필요)
ALTER TABLE productions ADD COLUMN video_provider TEXT DEFAULT 'higgsfield';

-- 신규 테이블: Provider별 프롬프트 (Higgsfield 것과 별도 저장 — prompt_packs 테이블은 건드리지 않음)
CREATE TABLE video_prompts (
  id, created_at, production_id, provider, generation_mode,
  clips TEXT,              -- JSON 배열: 씬별 결과(모드/프롬프트/시작·종료 프레임 프롬프트/모션 브릿지/재료/연속성/경고)
  version INTEGER DEFAULT 1
);

-- assets: Ingredient 메타데이터 (nullable, 기존 컬럼 영향 없음)
ALTER TABLE assets ADD COLUMN is_ingredient INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN ingredient_name TEXT;
ALTER TABLE assets ADD COLUMN ingredient_type TEXT;

-- assets: 어떤 Provider로 생성된 클립인지 기록 (Provider Performance/Learning의 최소 기반)
ALTER TABLE assets ADD COLUMN generation_provider TEXT;
```

`node:sqlite`는 `ADD COLUMN IF NOT EXISTS`가 없으므로 기존 Phase 3의 패턴대로 try/catch로 재실행 안전하게 처리한다.

## 6. Mode Recommender / Continuity / Complexity Guard — 정직성 원칙

스펙은 이 세 가지를 "자동 분석"이라 표현하지만, Character Consistency·Transformation Complexity 같은 판단은 결정론적 공식으로 계산할 수 있는 값이 아니다(Phase 2의 Hook Engine·Effect Director와 동일한 성격의 문제). 따라서:

- **Mode Recommender**: Claude가 씬의 실제 내용(purpose, 이전 씬과의 연결)을 근거로 추천하고, 반드시 `reason` 필드에 근거를 남긴다. "투명한 알고리즘"이 아니라 "근거를 남기는 판단"으로 정직하게 구현한다.
- **Continuity Validator**: 각 씬의 `start_state`/`end_state`를 Claude가 명시적으로 쓰게 하고, 다음 씬 생성 시 이전 씬의 `end_state`를 프롬프트에 그대로 인용해 이어 쓰게 한다. 완전 자동 mismatch 탐지(임베딩 비교 등)는 이번 범위에 넣지 않는다.
- **Complexity Guard**: Claude에게 자기 프롬프트에 "8초 안에 행동이 몇 개인지" 스스로 세게 하고 3개 초과면 `complexity_warning: true`를 달게 한다 (Publish Pack의 Content QC와 동일 패턴).

## 7. UI 변경

- PRODUCTION › PROMPTS 탭 상단에 **Provider 선택기** 추가 (Higgsfield 기본 선택 유지). Higgsfield 선택 시 화면 이하 부분은 기존 코드 그대로.
- Google Flow 선택 시 별도 섹션 렌더링: Generation Mode 선택(Auto Recommend 포함) → GENERATE → Clip Card 목록(모드/Start-End 미리보기/재료/최종 프롬프트/Copy 버튼들).
- Generic 선택 시 간단한 카드 목록(Copy 버튼만).
- ASSETS 탭: VIDEO_CLIP/REFERENCE_IMAGE 자산에 "Ingredient로 표시" 체크 + 이름/타입 입력 필드 추가.
- SETTINGS: Channel Profile에 "사용 가능한 Provider"(체크박스) + "기본 Provider" 필드 추가 (channel_profile.data JSON에 저장, 스키마 변경 없음).

## 8. 이번 세션 범위 (Patch 1~3, 7)

| Patch | 내용 | 범위 |
|---|---|---|
| 1 | Provider 타입, DB 마이그레이션, Orchestrator | 전체 구현 |
| 2 | Google Flow Compiler (Image-to-Video, Start-End Frame, Ingredients 기본 지원) + Generic Compiler | 전체 구현 |
| 3 | Provider 선택기 + Google Flow UI + Ingredient 태깅 + Settings | 전체 구현 |
| 4~6 | Start/End 전용 심화 워크플로우 UI, Provider Performance/Learning 통계, Prompt Versioning(v1/v2/v3) | **이번 세션 범위 밖** |
| 7 | Higgsfield 회귀 테스트 + Provider 전환 테스트 | 전체 구현 |

## 10. Patch 4~6 추가 범위 (이어서 진행)

절대 규칙(Higgsfield 미변경, Storyboard 재생성 금지, 자동화 금지)은 동일하게 유지한다. 세 Patch 모두 기존 인프라(video_prompts 테이블, Channel DNA 임계값 게이트 패턴)를 재사용하고 새 하위시스템을 만들지 않는다.

### Patch 4 — Start/End Frame 전용 심화 워크플로우 UI

문제: `start-end-frame`/`ingredients` 모드 클립은 이미 Start Frame / End Frame / Motion Bridge 3개 프롬프트를 각각 복사 가능한 카드로 보여주지만, 사용자가 "이 단계까지 했다"를 표시할 방법이 없다 — 여러 클립을 작업하다 어디까지 했는지 추적 불가.

구현:
- `video_prompts.clips[i]`에 `progress: { start_frame_done, end_frame_done, video_done }` 필드 추가 (새 컬럼 아님 — 기존 JSON payload 안에 저장).
- `PATCH /api/production/video-prompts/[id]/clip-progress` — `{ sceneNumber, field, value }`로 단일 클립의 진행 상태만 갱신.
- UI: 클립 카드 상단에 체크박스 3개(모드에 따라 Start Frame/End Frame/Video 또는 Video만) — 클릭 시 즉시 저장, refresh. 자동화 아님 — 사용자가 실제로 Google Flow에서 그 단계를 완료했다고 스스로 체크하는 수동 트래커.

### Patch 5 — Provider Performance/Learning 통계

문제: `assets.generation_provider` 컬럼은 이미 있지만 어디서도 값을 채우지 않는다 — Provider별 성공률을 계산할 데이터가 없다.

구현:
- ASSETS 탭: VIDEO_CLIP 자산의 Generation Outcome 옆에 Provider 선택 드롭다운 추가(기본값 = `production.video_provider`) → `generation_outcome`을 기록할 때 함께 저장.
- `lib/analytics/channelDna.js`에 `computeProviderPerformance()` 추가: `generation_provider`+`generation_outcome`이 모두 기록된 VIDEO_CLIP 자산을 provider별로 그룹화, Provider당 기록 3건 미만이면 "데이터 부족"으로 정직하게 표시(Channel DNA와 동일한 임계값 원칙), 3건 이상이면 성공률(SUCCESS / 전체) 계산.
- CHANNEL DNA 페이지에 "PROVIDER PERFORMANCE" 카드 추가 — 새 페이지를 만들지 않고 기존 페이지에 합류(중복 네비게이션 방지).

### Patch 6 — Prompt Versioning + Winner Library

문제: 현재 Provider별로 재생성할 때마다 `video_prompts`에 새 행이 들어가지만 `version`은 항상 1로 고정되고, UI는 `created_at` 기준 최신 행만 보여준다 — 과거 버전을 다시 볼 방법이 없고 "이 버전이 좋았다"를 표시할 수 없다.

구현:
- `insertVideoPrompts`: 동일 production+provider의 기존 최대 version을 조회해 `+1`로 저장(진짜 버전 증가, 하드코딩 1 제거). 과거 행은 삭제하지 않는다 — 그 자체가 버전 이력이다.
- `video_prompts.is_winner INTEGER DEFAULT 0` 컬럼 추가. `PATCH /api/production/video-prompts/[id]/winner`로 토글.
- PROMPTS 탭에 "VERSION HISTORY" 목록 추가 — 같은 provider의 모든 버전을 v1/v2/... 배지로 나열, 클릭하면 그 버전의 클립을 아래에 표시(현재는 최신 버전만 보여줬다면 이제 과거 버전도 조회 가능), ★ WINNER 토글 버튼 포함. "Winner Library"는 별도 폴더 구조 대신 이 목록을 Winner만 필터링하는 체크박스로 구현한다(과설계 방지).

## 9. 이번 세션(Patch 1~3, 7)에서 하지 않았던 것 — Provider Performance/Prompt Versioning은 이후 Patch 4~6에서 구현 완료 (`V3_1_STATUS.md` 참고)

- ~~Provider Performance/Learning 통계 페이지는 만들지 않는다~~ → **Patch 5에서 구현 완료.** `generation_provider` 컬럼에 실제로 값을 기록하고 Channel DNA 페이지에 카드로 노출한다.
- ~~Prompt Versioning(v1/v2/v3) 및 Winner Library 폴더 구조는 만들지 않는다~~ → **Patch 6에서 구현 완료.** `video_prompts.version`이 실제로 증가하며 과거 버전을 조회/★Winner 표시할 수 있다.
- **COMPARE PROMPTS(Provider 나란히 비교) 버튼**은 여전히 만들지 않는다.
- **`.claude/agents/google-flow-specialist.md`, `.claude/skills/google-flow-prompt/`**는 만들지 않는다 — 기존 원칙(웹앱 API가 동일 기능 제공)을 유지한다.
- **Export 패치(google-flow-prompts.md/json 파일 생성)**는 만들지 않는다.
- **First-Run Wizard**는 애초에 이 프로젝트에 존재하지 않으므로(V3.1에서도 미구현) 이번에도 만들지 않는다.
- **완전 자동 Continuity Mismatch 탐지**(임베딩/이미지 비교)는 하지 않는다 — Claude의 연속 서술 방식으로 대체한다.
- **Google Flow/Veo 자동화(로그인, API 호출, 다운로드)는 스펙 자체가 명시적으로 금지** — 애초에 구현 대상이 아니다.
