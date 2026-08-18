# dstory — 매일 인기 뉴스 → 이미지 → 릴스/쇼츠 영상 자동화

매일 인기 뉴스를 조사하고, 브라우저 자동화로 ChatGPT에게 관련 이미지를 만들어달라고 요청한 뒤,
이어서 그 이미지를 트렌디한 릴스/쇼츠 영상으로 만들어달라고 요청하고, 결과 영상을 지정한 폴더에 저장하는 파이프라인입니다.

## 파이프라인 개요

1. **뉴스 조사** — 그날 화제가 된 뉴스 1건(이상)을 조사합니다.
2. **이미지 생성** — `chatgpt.com` 을 브라우저로 열어, 조사한 뉴스 내용을 바탕으로 이미지를 만들어달라고 요청합니다.
3. **영상 생성** — 같은 흐름으로 이어서 `sora.chatgpt.com` 에 그 이미지를 올리고, 릴스/쇼츠에 어울리는 트렌디한 짧은 영상으로 만들어달라고 요청합니다.
4. **저장** — 생성된 이미지는 `output/images/`, 영상은 `output/videos/` 에 `YYYY-MM-DD-제목슬러그.mp4` 형식으로 저장됩니다.

> ChatGPT 자체 채팅에는 아직 영상 생성 기능이 없어(2026년 1월 기준), 영상 단계는 OpenAI의 별도 영상 생성 서비스인
> **Sora**(`sora.chatgpt.com`)를 자동으로 이어서 호출하도록 구현했습니다. Sora 이용 권한이 있는 계정이 필요합니다.

## ⚠️ 중요: 왜 API가 아니라 브라우저 자동화인가

이 프로젝트는 요청하신 대로 OpenAI API가 아니라 **브라우저로 ChatGPT/Sora 웹 화면을 직접 조작**합니다. 이 방식은:

- ChatGPT/Sora의 **웹 UI가 바뀌면 셀렉터가 깨질 수 있습니다** (`src/chatgptAutomation.js` 상단 주석 참고, `HEADLESS=false`로 실행해 디버깅).
- **자동화 봇 사용은 OpenAI 이용약관에서 제한하는 영역**입니다. 개인적·비상업적 용도로, 과도하지 않은 빈도(하루 1~2건)로만 사용하고,
  계정 정지 등 리스크는 사용자 본인이 감수해야 합니다. 더 안정적으로 쓰려면 추후 OpenAI 공식 API 기반으로 전환하는 것을 권장합니다.
- **로그인 세션(쿠키)이 필요**합니다 — 아래 설치 단계 참고.

## 설치

```bash
npm install
cp .env.example .env   # 필요하면 값 수정
```

Playwright의 Chromium이 이미 설치되어 있지 않다면:

```bash
npx playwright install chromium
```

## 1) 로그인 세션 만들기 (최초 1회, 화면이 있는 환경에서)

이 저장소를 실행하는 서버(원격 클라우드 샌드박스 등)에는 화면이 없어 로그인·캡차를 직접 처리할 수 없습니다.
**로컬 PC처럼 화면(브라우저 창)을 띄울 수 있는 환경**에서 아래를 실행하세요.

```bash
npm run login
```

브라우저 창이 뜨면 ChatGPT와 Sora에 각각 로그인한 뒤 터미널에서 Enter를 누르세요.
완료되면 `.auth/openai-storage-state.json` 파일이 생성됩니다.

**이 파일은 로그인 쿠키 그 자체이므로 절대 git에 커밋하거나 공유하지 마세요** (`.gitignore`에 이미 제외되어 있습니다).
자동화를 실제로 돌릴 위치(서버/컨테이너)에 이 파일을 안전하게 복사해두어야 합니다.
세션은 주기적으로 만료될 수 있으니, 자동화가 로그인 오류로 실패하면 이 단계를 다시 실행하세요.

## 2) 수동 실행

```bash
# 1. 오늘의 인기 뉴스만 조사해서 data/topics/오늘날짜.json 에 저장
npm run news

# 2. 저장된 뉴스 주제로 이미지+영상 생성 (data/topics/오늘날짜.json 이 없으면 자동으로 조사부터 함)
npm run generate

# 뉴스 조사 + 생성까지 한 번에 (독립 실행/서버 cron용)
npm run daily
```

같은 제목의 뉴스는 `data/history.json` 에 기록되어 다음에 자동으로 건너뜁니다.

## 3) 매일 자동 실행하기 — 두 가지 방식

### 방식 A. 서버/로컬 PC의 cron (가장 안정적)

로그인 세션이 유지되는 서버나 항상 켜져 있는 로컬 PC에서 cron으로 등록하세요.

```cron
0 9 * * * cd /path/to/dstory && npm run daily >> logs/cron.log 2>&1
```

이 방식은 완전히 독립적으로 동작하며(구글 뉴스 RSS로 스스로 뉴스를 조사), Claude Code 세션이 없어도 매일 실행됩니다.

### 방식 B. Claude Code Routine (이 세션에서 예약됨)

이 대화 세션에 **매일 오전 9시(KST)** 자동 실행되는 Routine을 만들어 두었습니다. Routine이 실행되면 Claude가:

1. 웹 검색으로 그날의 인기 뉴스를 조사해 `data/topics/오늘날짜.json` 에 저장
2. `npm run generate` 실행 (이미지 생성 → 영상 생성 → `output/videos/`에 저장)
3. 생성된 영상을 사용자에게 파일로 전달

**주의(중요):** Routine이 실행되는 클라우드 컨테이너는 비활동 상태가 길어지면 재생성될 수 있어, `.auth/openai-storage-state.json`
같은 로그인 세션 파일이 계속 남아있는다는 보장이 없습니다(보안상 git에도 커밋하지 않습니다). 따라서:

- 이 컨테이너/환경이 세션 간에 디스크를 유지하는 구성이 아니라면, Routine 실행 시마다 로그인 세션이 없어 자동화가 실패할 수 있습니다.
  이 경우 **방식 A(서버 cron)** 를 실제 실행 주체로 사용하고, Routine은 보조 알림/뉴스 조사 용도로만 쓰는 것을 권장합니다.
- Routine 실행이 로그인 세션 부재로 실패하면, Claude가 `npm run login`을 화면이 있는 환경에서 다시 실행해달라고 안내할 것입니다.

Routine 일정을 바꾸거나 끄고 싶으면 언제든 말씀해주세요.

## 폴더 구조

```
data/
  history.json        # 이미 처리한 뉴스 제목 기록 (중복 방지, git 추적)
  topics/오늘날짜.json  # 그날 조사된 뉴스 주제 (git 추적)
.auth/
  openai-storage-state.json  # 로그인 세션 (git 제외, 절대 커밋 금지)
output/
  images/             # 생성된 이미지 (git 제외)
  videos/             # 생성된 최종 영상 — 여기가 "지정한 폴더" 입니다 (git 제외)
  debug/               # 자동화 실패 시 스크린샷
```

## 문제 해결

- **로그인 세션 오류**: `npm run login`을 화면이 있는 환경에서 다시 실행하세요.
- **메시지 입력창/다운로드 버튼을 못 찾음**: ChatGPT/Sora UI가 바뀐 것입니다. `.env`에서 `HEADLESS=false`로 설정하고
  `npm run generate`를 실행해 직접 화면을 보면서 `src/chatgptAutomation.js`의 셀렉터를 갱신하세요.
  실패 시 `output/debug/`에 스크린샷이 저장됩니다.
- **네이버 뉴스로 조사하고 싶다면**: `.env`에 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 채우면 자동으로 그쪽을 사용합니다.
