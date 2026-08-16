# Higgsfield 프롬프트 — AI 시네마틱 판타지 시리즈

메인 수익화 엔진(Long-form 시리즈)용 프롬프트 템플릿. 캐릭터 일관성을 위해 매 시리즈마다 "캐릭터 시트"를 먼저 확정하고 재사용한다.

## 0. 캐릭터 시트 (시리즈 시작 전 1회 생성)

```
[캐릭터 이름], [나이/성별/종족], [외형 상세: 헤어스타일, 눈동자 색, 의상, 특징적 소품],
consistent character design, front view / side view / 3-4 view turnaround,
cinematic lighting, neutral background, high detail, [아트 스타일: 예) painterly fantasy illustration / photorealistic cinematic]
```
→ 생성 후 이미지를 레퍼런스로 저장, 이후 모든 장면 프롬프트에 재사용(캐릭터 참조 기능 활용).

## 1. 장면(Shot) 생성 기본 템플릿

```
[캐릭터 레퍼런스 참조], [행동/포즈], in [배경/장소],
[카메라 앵글: wide shot / close-up / over-the-shoulder / low angle],
[조명: golden hour / moody torchlight / stormy blue light],
[분위기: tense / hopeful / mysterious], cinematic film still, shallow depth of field,
[아트 스타일 고정값], 8k detail, dramatic composition
```

## 2. 액션/전투 장면

```
[캐릭터]가 [행동: 검을 휘두른다 / 도망친다 / 마법을 시전한다],
motion blur, dynamic camera angle, dust and debris particles,
dramatic rim lighting, epic fantasy battle atmosphere, [아트 스타일 고정값]
```

## 3. 감정/클로즈업 장면 (구독 전환 포인트)

```
[캐릭터]의 클로즈업, [감정: 절망 / 결의 / 놀람]이 드러나는 표정,
soft cinematic lighting, shallow focus, single tear / clenched jaw / wide eyes(감정에 맞게),
emotional close-up shot, [아트 스타일 고정값]
```

## 4. 클리프행어 마지막 장면

```
[캐릭터 또는 새로운 존재]가 화면 가장자리/그림자에서 등장,
sudden reveal, dramatic zoom, ominous lighting shift, freeze on shocked expression,
[아트 스타일 고정값], cut to black
```

## 제작 팁
- 시리즈 전체에서 아트 스타일 문자열(조명 톤, 렌더링 스타일)을 고정값으로 고정해 일관성 유지.
- 한 에피소드(3~8분)는 통상 15~25개 샷으로 구성 → 각 샷 프롬프트를 `production_tracker.csv`의 해당 행에 링크/기록.
- 씬 생성 실패/캐릭터 붕괴 시 캐릭터 레퍼런스 이미지를 다시 첨부해 재생성.
