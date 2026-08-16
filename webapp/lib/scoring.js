// Mirrors the rubric in strategy/04-trend-response-system.md
export const SCORE_FIELDS = [
  { key: 'genre_fit', label: '장르 적합성', hint: '우리 장르(판타지/음식/가족/비언어) 구조로 재해석 가능한가' },
  { key: 'higgsfield_feasibility', label: 'Higgsfield 구현 가능성', hint: '기존 캐릭터/에셋 재사용으로 생성 가능한가' },
  { key: 'speed_fit', label: '속도 적합성', hint: '24~48시간 내 기획~업로드가 가능한가' },
  { key: 'risk_low', label: '정책/저작권 리스크 낮음', hint: '원곡/원본을 그대로 쓰지 않고 구조만 차용해도 재현되는가' },
  { key: 'brand_fit', label: '브랜드 적합성', hint: '채널 톤과 어긋나지 않는가' },
];

export function computeTotal(scores) {
  return SCORE_FIELDS.reduce((sum, f) => sum + (Number(scores[f.key]) || 0), 0);
}

export function decisionFromTotal(total) {
  if (total >= 20) return 'fast-track';
  if (total >= 13) return 'monitor';
  return 'pass';
}

export const DECISION_LABEL = {
  'fast-track': { text: 'Fast-track', color: 'bg-accent text-white' },
  monitor: { text: 'Monitor', color: 'bg-amber-200 text-amber-900' },
  pass: { text: 'Pass', color: 'bg-neutral-200 text-neutral-600' },
};

export const GENRES = [
  { key: 'cinematic_fantasy', label: 'AI 시네마틱 판타지 시리즈' },
  { key: 'food_cooking', label: '음식/요리 비주얼' },
  { key: 'family_animation', label: '가족·일상 애니메이션' },
  { key: 'non_verbal', label: '비언어 글로벌 미니드라마' },
];

export const HIGGSFIELD_MODELS = [
  {
    id: 'seedance_2_0',
    label: 'Seedance 2.0',
    when: '캐릭터/제품 일관성 유지 + 이미지·영상·오디오 레퍼런스 결합',
    aspect_ratios: ['auto', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
    duration: [4, 15],
  },
  {
    id: 'seedance_2_0_mini',
    label: 'Seedance 2.0 Mini',
    when: '위와 동일하지만 예산/속도 우선(480~720p)',
    aspect_ratios: ['auto', '16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
    duration: [4, 15],
  },
  {
    id: 'kling3_0',
    label: 'Kling v3.0',
    when: '멀티샷 시네마틱 + 오디오 싱크 + 모션 트랜스퍼 (판타지 액션/감정 장면)',
    aspect_ratios: ['16:9', '9:16', '1:1'],
    duration: [3, 15],
  },
  {
    id: 'minimax_h3',
    label: 'MiniMax H3',
    when: '2K 키프레임 품질, 복합 레퍼런스',
    aspect_ratios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    duration: [4, 15],
  },
];

export function recommendModel({ needsCharacterConsistency, needsMultiShotCinematic, needs2K, budgetPriority }) {
  if (needs2K) return 'minimax_h3';
  if (needsMultiShotCinematic) return 'kling3_0';
  if (needsCharacterConsistency) return budgetPriority ? 'seedance_2_0_mini' : 'seedance_2_0';
  return budgetPriority ? 'seedance_2_0_mini' : 'seedance_2_0';
}
