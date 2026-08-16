// Vendor-neutral prompt compiler — for quickly trying a Video AI that
// doesn't have a dedicated compiler yet. Reuses the existing storyboard,
// same as the Google Flow compiler; outputs structured fields rather than
// a natural-language paragraph since it isn't tuned to any one provider's
// preferred style.
export function buildGenericPrompt({ storyboard, concept, hook, globalVisualLock }) {
  const storyboardText = (storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 Vendor-neutral 영상 생성 프롬프트 컴파일러다. Story나 Storyboard를 새로 만들지 않는다 — 아래 확정된 Storyboard를 구조화된 프롬프트로 번역한다.

[컨셉] ${concept.title} — ${concept.logline}
[선택된 Hook] ${hook ? `${hook.type}: "${hook.hook_text}"` : '미선택'}
[기존 Global Visual Lock] ${globalVisualLock || '(없음 — 새로 하나 만들어라)'}

[확정된 Storyboard]
${storyboardText}

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "global_visual_lock": "...",
  "clips": [
    {
      "scene_number": 1,
      "duration_sec": 8,
      "subject": "...",
      "action": "...",
      "camera": "...",
      "motion": "...",
      "lighting": "...",
      "environment": "...",
      "start_state": "...",
      "end_state": "...",
      "continuity_notes": "...",
      "negative_constraints": ["..."]
    }
  ]
}

원본 트렌드나 다른 크리에이터의 영상을 그대로 재현하지 마라.`;
}
