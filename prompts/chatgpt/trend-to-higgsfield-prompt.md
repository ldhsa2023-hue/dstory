# ChatGPT 프롬프트 — 트렌드 → Higgsfield 영상 생성 요청 자동 변환

`trend-analysis.md`가 "트렌드를 우리 장르로 어떻게 재해석할지"를 다룬다면, 이 문서는 그 재해석안을 **Higgsfield에 바로 넣을 수 있는 영상 생성 요청(모델·프롬프트·파라미터)** 으로 변환하는 전용 구조다.

```
트렌드 리서치 (trend_tracker.csv)
        │
        ▼
① GPT에 "트렌드+재해석안" 입력  ──▶  trend-analysis.md (구조 분석·재해석)
        │
        ▼
② GPT에 "Higgsfield 요청 생성 마스터 프롬프트" 입력  ──▶  본 문서
        │  (출력: model / prompt / aspect_ratio / duration / medias 필드가 채워진 JSON)
        ▼
③ 그 JSON을 그대로 Higgsfield generate_video 요청 파라미터로 사용
```

## 1. 입력 (GPT에게 줄 정보)

```
- 트렌드 요약: [trend_tracker.csv 의 description]
- 재해석안: [trend-analysis.md 2단계 출력 결과 붙여넣기]
- 사용할 시리즈/캐릭터: [기존 캐릭터 시트 요약 또는 "신규 캐릭터 없음(비주얼 중심)"]
- 목표 포맷: [Shorts 9:16 15~30초 / Long-form 16:9 3~8분]
- 사용 가능한 참조 이미지: [캐릭터 레퍼런스 media_id 또는 "없음"]
```

## 2. 마스터 프롬프트 (GPT에 그대로 붙여넣기)

```
너는 Higgsfield AI 영상 생성 요청을 설계하는 전문가다.
아래 트렌드 재해석안을 바탕으로, Higgsfield에 바로 제출 가능한 영상 생성 요청을 샷 단위로 설계해라.

[트렌드 요약]: ...
[재해석안]: ...
[캐릭터/에셋]: ...
[목표 포맷]: ...

각 샷마다 아래 JSON 스키마를 정확히 채워서 출력해라. 텍스트 설명 없이 JSON 배열만 출력한다.

{
  "shot_number": 1,
  "model": "<seedance_2_0 | seedance_2_0_mini | kling3_0 | minimax_h3 중 아래 기준으로 선택>",
  "prompt": "<카메라 앵글, 인물/사물 행동, 배경, 조명, 분위기, 아트 스타일을 포함한 완전한 영어 프롬프트 한 문장~두 문장>",
  "aspect_ratio": "9:16 또는 16:9",
  "duration": <모델 허용 범위 내 초 단위 정수>,
  "medias": [{"role": "image_references 또는 start_image", "value": "<캐릭터 레퍼런스 media_id 자리표시자, 없으면 빈 배열>"}],
  "notes": "<원본 트렌드에서 차용한 후킹 구조가 이 샷에 어떻게 반영됐는지 1줄>"
}

모델 선택 기준 (반드시 아래 규칙을 따를 것):
- 캐릭터 일관성(레퍼런스 이미지 기반) 유지가 필요하면 → seedance_2_0 (표준) 또는 seedance_2_0_mini (예산/속도 우선, 480~720p만)
- 여러 샷을 이어붙이는 시네마틱 멀티샷 + 오디오/모션 트랜스퍼가 필요하면 → kling3_0
- 2K 키프레임 품질이나 이미지/영상/오디오 레퍼런스를 복합적으로 쓰면 → minimax_h3
- 원본 음원/영상을 그대로 재현하지 말 것 — prompt 필드에는 항상 우리 오리지널 캐릭터/비주얼만 묘사한다.

출력은 유효한 JSON만 허용된다. 설명 문장을 JSON 앞뒤에 붙이지 마라.
```

## 3. 모델 선택 치트시트 (2026-08 기준 Higgsfield 카탈로그)

| 모델 | 적합 상황 | aspect_ratio | duration | 비고 |
|---|---|---|---|---|
| `seedance_2_0` | 캐릭터/제품 일관성 유지, 이미지·영상·오디오 레퍼런스 결합 | auto/16:9/9:16/1:1 등 | 4~15초 | 표준 품질, 720p~4K(mode=std) |
| `seedance_2_0_mini` | 위와 동일하지만 예산·속도 우선 | 동일 | 4~15초 | 480p/720p만, 저비용 |
| `kling3_0` | 멀티샷 시네마틱, 오디오 싱크, 모션 트랜스퍼 (판타지 시리즈 액션/감정 장면에 적합) | 16:9/9:16/1:1 | 3~15초 | pro/4k 모드 지원 |
| `minimax_h3` | 2K 키프레임, 복합 레퍼런스 | auto/9:16/16:9 등 | 4~15초 | 2K 고정 |

Shorts(9:16, 15~30초)는 통상 3~5개 샷(샷당 4~8초)으로 쪼개 각 샷을 위 스키마로 요청한다.

## 4. 워크드 예시 — TREND-003 (before/after 즉시 리빌 포맷 → 음식 장르)

`trend_tracker.csv`의 TREND-003(Fast-track, 24점)을 입력해 GPT가 반환할 것으로 예상되는 출력:

```json
[
  {
    "shot_number": 1,
    "model": "seedance_2_0",
    "prompt": "Extreme close-up of raw cheese fondue ingredients on a rustic wooden board, cold pale lighting, slightly messy and unappealing arrangement, static camera, realistic food photography style, vertical framing",
    "aspect_ratio": "9:16",
    "duration": 4,
    "medias": [],
    "notes": "트렌드의 'before' 단계 - 의도적으로 밋밋하게 시작해 반전 낙차를 키움"
  },
  {
    "shot_number": 2,
    "model": "seedance_2_0",
    "prompt": "Hands pouring melted cheese over the board in a swirling motion, steam rising, warm golden light suddenly sweeping in, dynamic top-down angle, glossy satisfying texture, realistic food photography style, vertical framing",
    "aspect_ratio": "9:16",
    "duration": 5,
    "medias": [],
    "notes": "전환 구간 - 트렌드의 '반전 낙차'를 조명 변화와 동작으로 표현"
  },
  {
    "shot_number": 3,
    "model": "seedance_2_0",
    "prompt": "Hero shot of the finished glossy cheese fondue board, warm golden hour lighting, steam and cheese pull detail, restaurant-quality plating, dramatic reveal framing, vertical framing, 4k detail",
    "aspect_ratio": "9:16",
    "duration": 5,
    "medias": [],
    "notes": "트렌드의 'after' 리빌 순간 - 최대 임팩트 지점"
  }
]
```

→ 이 JSON의 각 객체는 그대로 Higgsfield `generate_video` 호출의 `params`(model/prompt/aspect_ratio/duration/medias)로 사용한다. 실제 제출 전에는 `get_cost:true`로 크레딧을 먼저 확인한다.

## 5. 운영 규칙

- 캐릭터가 등장하는 시리즈(판타지/가족 애니메이션)는 `medias`에 반드시 기존 캐릭터 레퍼런스 media_id를 넣어 일관성을 유지한다. 신규 캐릭터를 그때그때 새로 설계하지 않는다.
- GPT 출력이 JSON 스키마를 벗어나면(설명 텍스트 포함, 필드 누락 등) 재요청한다 — 사람이 수작업으로 다듬지 않고 즉시 재생성 가능한 상태를 유지하는 것이 이 구조의 핵심이다.
- 생성 완료 후 실제 사용한 model/aspect_ratio/duration/크레딧을 `database/production_tracker.csv`에 기록한다.
