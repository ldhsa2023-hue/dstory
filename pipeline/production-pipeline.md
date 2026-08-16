# 제작 파이프라인

아이디어 발굴부터 데이터 분석까지의 전 과정을 템플릿화한다. 각 단계는 `prompts/` 폴더의 프롬프트와 `database/` 폴더의 기록 시트에 연결된다.

```
1. 아이디어 발굴          → prompts/chatgpt/idea-generation.md
2. 콘텐츠 선정            → database/content_ideas.csv 에 기록, 채택 여부 판단
3. ChatGPT 스토리 설계     → prompts/chatgpt/script-writing.md
4. 장면 분할              → 대본을 8~15초 단위 샷으로 분해
5. 비주얼/이미지 설계      → 캐릭터·배경 레퍼런스 이미지 확정
6. Higgsfield 프롬프트 생성 → prompts/higgsfield/*.md (장르별)
7. 영상 생성              → Higgsfield 생성 → 검수 → 재생성(필요시)
8. 편집                  → 컷 편집, 자막, BGM, 효과음
9. 제목/썸네일 제작        → prompts/chatgpt/titles-thumbnails.md
10. 업로드                → SEO 설명문: prompts/chatgpt/seo-keywords.md
11. 성과 측정             → database/performance_analytics.csv
12. 데이터 분석            → strategy/02-recommended-strategy.md 주간 점검
13. 다음 콘텐츠 개선        → 1번으로 순환
```

## 단계별 산출물 체크리스트

### 1~2. 기획
- [ ] 아이디어가 `strategy/01-genre-analysis.md` 상위 장르(A/C 우선)에 속하는가
- [ ] `content_ideas.csv`에 아이디어 ID, 장르, 예상 포맷(Shorts/Long-form), 우선순위 기록

### 3~6. 사전 제작
- [ ] 대본에 1~3초 Hook이 명시되어 있는가
- [ ] 장면별 Higgsfield 프롬프트에 캐릭터 일관성 레퍼런스가 포함되어 있는가
- [ ] 시리즈물인 경우 이전 에피소드와 캐릭터/배경 프롬프트가 재사용 가능한 형태로 저장되어 있는가 (`prompts/higgsfield/` 내 시리즈별 하위 문서로 축적)

### 7~10. 제작 & 업로드
- [ ] 생성된 클립이 Hook·전개·클리프행어(또는 마무리) 구조를 만족하는가
- [ ] 제목/썸네일이 클릭 유도 + 낚시성 아님(정책 리스크 없음)을 동시에 만족하는가
- [ ] 설명문에 시리즈 이전/다음 편, 플레이리스트 링크가 포함되어 있는가

### 11~13. 분석 & 개선
- [ ] 업로드 후 48시간, 7일, 30일 시점에 `performance_analytics.csv` 갱신
- [ ] 이탈 구간(Audience Retention Graph) 확인 후 다음 대본의 해당 구간 구조 수정
- [ ] 주간 리뷰에서 상/하위 20% 콘텐츠의 공통 요소를 `02-recommended-strategy.md`에 반영

## 일일 제작 목표 (Phase 2 기준)

| 포맷 | 일일 목표 | 소요 시간(개략) |
|---|---|---|
| Shorts (음식/비주얼) | 2~3편 | 편당 20~30분 (기획~업로드) |
| Long-form 에피소드 | 주 2~3편 (격일) | 편당 2~4시간 |
| Fast Lane (트렌드 대응) | 예비 1편 슬롯 | 스코어 확정 후 24~48시간 |

## 트렌드 대응(Fast Lane) 분기

정규 파이프라인과 별도로, 지금 유행 중인 포맷/사운드/챌린지를 포착해 우리 장르로 즉시 재해석하는 단축 경로가 있다. 트렌드 레이더 → 적합도 스코어링 → Fast Lane 제작의 전체 구조는 `strategy/04-trend-response-system.md`, 트렌드 분석·재해석 프롬프트는 `prompts/chatgpt/trend-analysis.md`, 트렌드 기록은 `database/trend_tracker.csv`를 사용한다. 매일 아침 트렌드 레이더 스캔을 정규 파이프라인 1단계보다 먼저 수행하고, Fast-track 판정된 트렌드가 있으면 그날의 예비 슬롯에 우선 투입한다.
