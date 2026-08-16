# dstory webapp — 로컬 콘텐츠 기획 도구

`../strategy`, `../prompts`, `../database`에 정리된 트렌드 대응 시스템을 실제로 사용할 수 있는 로컬 웹앱으로 구현한 것입니다. 3단계 흐름을 한 화면 세트에서 이어서 진행합니다.

1. **바이럴 영상 조사·분석·기획** (`/trends`) — 트렌드를 기록하고, GPT 분석 프롬프트를 생성해 구조를 분석 → 우리 장르로 재해석 → 5개 기준으로 적합도를 채점(20점 이상 Fast-track).
2. **씬/삽화 생성용 GPT 프롬프트** (`/scenes`) — 기획안을 샷 단위 대본(화면 묘사/내레이션/자막)으로 쪼개는 GPT 프롬프트를 생성하고 결과를 표로 저장.
3. **Higgsfield 프롬프트·가이드 생성** (`/higgsfield`) — 샷 리스트를 Higgsfield `generate_video`에 바로 제출 가능한 JSON(model/prompt/aspect_ratio/duration/medias)과 단계별 사용 가이드로 변환.

## 실행 방법

```bash
cd webapp
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 을 엽니다.

## OpenAI API 연동 (선택)

키가 없어도 모든 기능이 동작합니다 — 각 단계에서 만들어진 프롬프트를 복사해 ChatGPT에 직접 붙여넣고, 결과를 다시 앱에 붙여넣으면 됩니다("템플릿 모드").

`/settings` 에서 OpenAI API 키를 등록하면 "GPT로 바로 생성" 버튼이 실제 OpenAI API(`gpt-4o-mini`)를 호출해 결과를 자동으로 채워줍니다("라이브 모드"). 키는 `data/settings.json`(gitignore 처리됨)에 로컬로만 저장되고 외부로 전송되지 않습니다.

## 데이터 저장

별도 DB 설치 없이 `data/*.json` 파일에 저장됩니다.

| 파일 | 내용 |
|---|---|
| `data/trends.json` | 기록된 트렌드 + 적합도 스코어 + 재해석안 |
| `data/ideas.json` | 트렌드에서 전환되었거나 직접 입력한 기획 |
| `data/scenes.json` | 저장된 샷 리스트(화면 묘사/내레이션/자막) |
| `data/higgsfield_requests.json` | 생성된 Higgsfield 요청 JSON + 가이드 |
| `data/settings.json` | (gitignore) OpenAI API 키 |

프로젝트를 다른 사람과 공유하기 전에 `data/settings.json`이 커밋되지 않았는지, 필요하면 `data/*.json`을 초기화(`[]`)했는지 확인하세요.

## Higgsfield로 실제 영상 생성까지 연결하기

3단계에서 생성된 JSON의 각 객체(`model`, `prompt`, `aspect_ratio`, `duration`, `medias`)는 그대로 다음 두 방법 중 하나로 사용합니다.

- **Higgsfield 웹앱**: 해당 모델 선택 → prompt 붙여넣기 → aspect ratio/duration 설정 → (필요 시) 캐릭터 레퍼런스 이미지 업로드 → 생성.
- **Claude Code (Higgsfield MCP)**: `generate_video` 호출 시 `params`에 JSON 객체의 값을 그대로 전달합니다. 제출 전 `get_cost:true`로 크레딧을 먼저 확인하세요.

## 알려진 사항

- 로컬 단일 사용자 도구로 설계되어 인증/권한 제어가 없습니다. 외부에 노출하지 말고 로컬에서만 사용하세요.
- Next.js 14.2.x 최신 패치를 사용하지만, 이 버전대는 최신 보안 권고(Server Actions/Server Function 관련) 일부가 아직 backport되지 않았습니다. 이 앱은 Server Actions를 사용하지 않고 API 라우트만 사용하므로 해당 취약점의 실제 노출 경로는 없지만, 프로덕션에 배포할 계획이 있다면 Next 16 이상으로 업그레이드를 검토하세요.
