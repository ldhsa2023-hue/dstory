import { GENRES } from '../scoring';

export function buildTrendResearchPrompt({ profile, filters }) {
  const niche = GENRES.find((g) => g.key === profile?.primaryNiche)?.label || profile?.primaryNiche || '미지정';
  const platformFilter = filters?.platform || 'GLOBAL';
  const windowFilter = filters?.window || '7D';

  return `너는 YouTube Shorts / TikTok / Instagram Reels 바이럴 트렌드 조사 분석가다.
WebSearch를 사용해 실제로 확인 가능한 최근 트렌드를 조사해라.

[채널 프로필]
- 주 장르: ${niche}
- 채널 목표: ${profile?.channelGoal || '미지정'}
- 선호 포맷: ${profile?.preferredAspectRatio || '9:16'}, 길이 ${profile?.preferredVideoLength || 20}초

[조사 범위]
- 플랫폼 필터: ${platformFilter}
- 기간: ${windowFilter}

지침:
1. 실제로 검색해서 확인한 내용만 근거로 삼는다. 확인되지 않은 수치(조회수 등)는 "UNKNOWN"으로 표기하고 절대 지어내지 않는다.
2. 원본을 그대로 베끼라는 것이 아니라, 재해석 가능한 트렌드 후보를 찾는 것이다.
3. 최대한 폭넓게 조사하되, 실제로 근거를 확인한 후보만 최종 목록에 남긴다 (최소 5개, 최대 12개 목표).

각 트렌드 후보는 아래 JSON 스키마를 정확히 따른다. 설명 문장 없이 JSON 배열만 출력해라.

[
  {
    "name": "트렌드 이름 (짧게)",
    "platform": "YouTube Shorts | TikTok | Instagram Reels | Cross-platform",
    "stage": "SEED | EMERGING | ACCELERATING | MAINSTREAM | SATURATED | DECLINING | REVIVAL",
    "momentum": "1문장 - 왜 이 단계라고 판단했는지",
    "evidence_confidence": "LOW | MEDIUM | HIGH",
    "evidence_source": "실제로 참고한 검색 출처 요약 (URL 또는 매체명, 없으면 UNKNOWN)",
    "cross_platform_signal": "다른 플랫폼에서도 관찰되는지 여부와 근거",
    "competition": "LOW | MEDIUM | HIGH",
    "higgsfield_fit": 1,
    "originality_potential": 1,
    "series_potential": 1,
    "risk": "저작권/정책/브랜드 리스크 요약",
    "opportunity_score": 0,
    "format": "shorts | longform",
    "rationale": "이 채널이 이 트렌드를 왜 지금 시도해야 하는지 2문장 이내"
  }
]

higgsfield_fit / originality_potential / series_potential 은 1~5 정수. opportunity_score는 momentum·evidence_confidence·competition을 종합한 0~100 정수다.`;
}
