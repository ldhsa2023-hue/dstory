// Google Flow / Veo prompt compiler. Reuses the EXISTING storyboard as
// Single Source of Truth (spec section 37) — it never invents a new story,
// only translates the already-approved scenes into Google Flow's natural-
// language, continuous-8-second-shot prompt style (spec section 15).
export function buildGoogleFlowPrompt({ storyboard, concept, hook, globalVisualLock, generationMode, ingredients, audioIntent }) {
  const modeInstruction =
    generationMode && generationMode !== 'auto'
      ? `모든 씬에 "${generationMode}" 모드를 사용해라 (사용자가 직접 선택함). recommended_mode 필드에도 동일하게 채워라.`
      : `씬마다 가장 적합한 Generation Mode를 판단해서 recommended_mode에 채워라. 판단 근거(캐릭터/오브젝트 일관성 필요 여부, 시작/종료 상태의 중요도, 변형 복잡도, 카메라 복잡도)를 mode_reason에 반드시 남겨라.`;

  const ingredientsText = (ingredients || [])
    .map((i) => `- ${i.ingredient_name} (${i.ingredient_type})`)
    .join('\n');

  const storyboardText = (storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 Google Flow / Veo 전용 영상 생성 프롬프트 컴파일러다. Story나 Storyboard를 새로 만들지 않는다 — 아래 이미 확정된 Storyboard를 Google Flow가 이해하기 쉬운 자연어 지시문으로 "번역"만 한다.

[컨셉] ${concept.title} — ${concept.logline}
[선택된 Hook] ${hook ? `${hook.type}: "${hook.hook_text}"` : '미선택'}
[기존 Global Visual Lock] ${globalVisualLock || '(없음 — 새로 하나 만들어라)'}
[Audio Intent] ${audioIntent || 'NATURAL_ONLY'}

[확정된 Storyboard — 이 씬 구성을 그대로 따른다]
${storyboardText}

[사용 가능한 Ingredient(캐릭터/오브젝트/환경 Reference)]
${ingredientsText || '(등록된 Ingredient 없음)'}

${modeInstruction}

각 씬마다 8초 단위의 연속 샷(continuous shot) 원칙을 지켜라 — 하나의 Clip에는 ONE PRIMARY ACTION + ONE CAMERA IDEA + ONE STORY PURPOSE만 담는다. 8초 안에 행동이 3개를 넘으면 complexity_warning을 true로 설정하고 이유를 적어라.

flow_prompt는 아래 스타일을 따르는 완전한 자연어 문단으로 작성한다 (기계적 Key:Value 나열 금지):

"Create an 8-second continuous cinematic shot. Begin exactly from the uploaded reference image. [Subject and starting state]. [Primary action]. The camera [movement]. Maintain the exact character appearance, clothing, environment and visual identity from the reference image. [Environmental motion]. End with [precise ending state]. This ending must provide a clean visual continuity point for the next clip. No sudden scene changes. No new characters. No unwanted objects. No text. No logos."

start-end-frame 또는 ingredients 모드인 씬만 start_frame_prompt/end_frame_prompt/motion_bridge_prompt를 채운다 (해당 없으면 빈 문자열). motion_bridge_prompt는 시작/종료 이미지 설명을 반복하지 말고 "두 이미지 사이에서 일어나야 하는 움직임"만 설명해라.

각 씬의 continuity_notes에는 이전 씬의 end_state를 인용해서 어떻게 이어지는지 반드시 설명해라 (Scene 1은 "N/A - 첫 씬").

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "global_visual_lock": "...",
  "clips": [
    {
      "scene_number": 1,
      "duration_sec": 8,
      "recommended_mode": "image-to-video | start-end-frame | ingredients | text-to-video",
      "mode_reason": "...",
      "start_state": "...",
      "end_state": "...",
      "ingredients_used": ["..."],
      "start_frame_prompt": "",
      "end_frame_prompt": "",
      "motion_bridge_prompt": "",
      "flow_prompt": "...",
      "audio_intent": "NATURAL_ONLY | DIALOGUE | SFX | FULL_AUDIO | NO_PREFERENCE",
      "continuity_notes": "...",
      "negative_constraints": ["No sudden scene changes", "No new characters", "No text", "No logos"],
      "complexity_warning": false,
      "complexity_note": ""
    }
  ]
}

원본 트렌드나 다른 크리에이터의 영상을 그대로 재현하지 마라. 모든 비주얼은 오리지널이어야 한다.`;
}
