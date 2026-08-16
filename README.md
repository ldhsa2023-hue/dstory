# dstory — AI 유튜브 수익화 전략 & 제작 시스템

ChatGPT와 Higgsfield AI Ultra Plan을 활용해 유튜브 채널의 **구독자·시청시간·수익화 조건 달성**을 추진하기 위한 전략 기획 문서와 운영 시스템 저장소입니다.

## 최종 목표

AI 기반 영상 제작 시스템을 구축하여 조회수·구독자·시청시간·재방문율을 지속적으로 증가시키고, 최종적으로 YouTube 수익화 조건(구독자 1,000명 + 연간 시청시간 4,000시간 또는 90일 Shorts 조회수 1,000만 회)을 달성한다.

## 저장소 구조

```
dstory/
├── strategy/                    # 전략 기획 문서
│   ├── 01-genre-analysis.md     # 콘텐츠 장르 17개 기준 비교 분석
│   ├── 02-recommended-strategy.md # 우선순위 전략 & 실행 로드맵
│   ├── 03-content-expansion-model.md # 1 아이디어 → 콘텐츠 자산화 모델
│   └── 04-trend-response-system.md # 실시간 트렌드 리서치 & Fast Lane 대응 시스템
├── pipeline/
│   └── production-pipeline.md   # 기획→제작→업로드→분석 파이프라인 (+ Fast Lane 분기)
├── prompts/
│   ├── chatgpt/                 # ChatGPT 업무별 프롬프트 템플릿 (트렌드 분석 포함)
│   └── higgsfield/              # Higgsfield 영상 생성 프롬프트 템플릿 (장르별)
├── database/                    # 콘텐츠 기획/제작/성과/트렌드 추적 DB (CSV)
│   ├── content_ideas.csv
│   ├── production_tracker.csv
│   ├── performance_analytics.csv
│   └── trend_tracker.csv
└── templates/                   # 대본/후킹 템플릿
    ├── shorts_script_template.md
    └── longform_script_template.md
```

## 사용 순서

1. `strategy/01-genre-analysis.md` 로 어떤 콘텐츠 장르에 집중할지 판단한다.
2. `strategy/02-recommended-strategy.md` 의 로드맵에 따라 시리즈를 선정한다.
3. `pipeline/production-pipeline.md` 단계에 맞춰 `prompts/chatgpt/`, `prompts/higgsfield/` 의 프롬프트를 순서대로 사용해 제작한다.
4. 기획 단계마다 `database/content_ideas.csv` 에 아이디어를 기록하고, 제작 진행 상황은 `production_tracker.csv`, 업로드 후 성과는 `performance_analytics.csv` 에 기록한다.
5. 매일 트렌드 레이더를 돌려 `database/trend_tracker.csv` 에 후보를 기록하고, 스코어 20점 이상(Fast-track)인 트렌드는 `strategy/04-trend-response-system.md` 의 Fast Lane 경로로 24~48시간 내 즉시 제작한다.
6. 매주 성과 데이터를 검토하여 `strategy/02-recommended-strategy.md` 를 갱신한다 (성과 좋은 요소 확대 / 낮은 요소 폐기, 트렌드 적중률도 함께 반영).

이 저장소는 감이 아닌 데이터와 반복 가능한 시스템으로 유튜브 수익화에 접근하기 위한 운영 기반입니다.
