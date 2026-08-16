import { GENRES } from '../scoring';

export function buildConceptPrompt({ trend, profile, channelDnaSummary }) {
  const niche = GENRES.find((g) => g.key === profile?.primaryNiche)?.label || profile?.primaryNiche || '미지정';

  return `너는 오리지널 콘텐츠 컨셉 기획자다.
아래 트렌드의 "구조"만 참고해서 최소 10개의 새로운 오리지널 컨셉을 만들어라. 트렌드를 그대로 베끼지 않는다.

[트렌드]
이름: ${trend.name}
플랫폼: ${trend.platform}
모멘텀: ${trend.momentum}
근거: ${trend.evidence_confidence}

[채널]
주 장르: ${niche}
목표: ${profile?.channelGoal || '미지정'}
선호 포맷: ${profile?.preferredAspectRatio || '9:16'}, ${profile?.preferredVideoLength || 20}초
${channelDnaSummary ? `\n[Channel DNA — 실제 게시 성과 기반 참고 정보, 절대 규칙 아님]\n${channelDnaSummary}\n` : ''}

Originality Guard: 각 컨셉은 원본 트렌드 대비 아래 8개 요소 중 최소 4개를 변경해야 한다 — Subject, Character, World, Story, Conflict, Visual, Payoff, Ending. 어떤 요소를 바꿨는지 differentiation 배열에 명시해라.

각 컨셉은 아래 JSON 스키마를 따른다. 설명 문장 없이 JSON 배열만 출력해라.

[
  {
    "title": "컨셉 제목",
    "logline": "1문장 로그라인",
    "why_now": "왜 지금인가 1문장",
    "genre": "cinematic_fantasy | food_cooking | family_animation | non_verbal",
    "format": "shorts | longform",
    "length_sec": 20,
    "clip_count": 3,
    "differentiation": ["Subject", "Ending"],
    "scores": {
      "viral": 1,
      "originality": 1,
      "production_ease": 1,
      "higgsfield_fit": 1,
      "series_fit": 1,
      "global_fit": 1,
      "subscriber_fit": 1,
      "watchtime_fit": 1
    }
  }
]

scores의 각 값은 1~5 정수다.`;
}
