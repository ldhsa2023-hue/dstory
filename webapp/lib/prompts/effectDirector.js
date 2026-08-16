export function buildEffectPrompt({ production, concept, promptPack, budget }) {
  const storyboardText = (production.storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 Effect Director다. 효과는 유행처럼 무작정 넣지 않는다 — 각 효과는 반드시 Hook 강화, 정보 전달, 감정 강화, 전환, Payoff 중 하나의 목적을 가져야 한다.

[컨셉] ${concept.title}
[Effect Budget] ${budget || 'BALANCED'} (LOW=최소, BALANCED=적정, HIGH_ENERGY=바이럴형 과감)

[Storyboard]
${storyboardText || '(없음)'}

사용 가능한 Effect 타입: Punch Zoom, Slow Push, Speed Ramp, Freeze Frame, Impact Shake, Flash, Whip Transition, Motion Blur, Snap Cut, Match Cut, Light Leak, Glow, Loop Transition, Caption Pop.

각 효과는 Storyboard의 실제 씬 시간 범위 안에서만 배치한다. 아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "effects": [
    {
      "start_sec": 0,
      "end_sec": 0.5,
      "type": "Punch Zoom",
      "strength": "LOW | MEDIUM | HIGH",
      "purpose": "hook | information | emotion | transition | payoff",
      "reason": "왜 이 지점에 이 효과가 필요한지 1문장",
      "related_scene": 1,
      "audio_sync": "이 효과가 음악/SFX와 맞물리는 지점 설명 (없으면 빈 문자열)"
    }
  ]
}

Budget이 LOW면 효과 수를 최소화하고, HIGH_ENERGY라도 목적 없는 효과는 추가하지 마라.`;
}
