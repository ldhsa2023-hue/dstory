// ChatGPT Image Prompt Studio + Higgsfield Video Prompt Studio, combined into
// one structured generation step for V3.1 Phase 1 (Story Engine + Storyboard +
// both Prompt Studios collapsed into a single Claude call; can be split into
// separate steps in a later phase).
export function buildPromptPackPrompt({ concept, hook, profile, higgsfieldMode }) {
  const clipSeconds = 8; // spec default: 8-second Higgsfield clips
  const clipCount = concept.clip_count || Math.max(1, Math.round((concept.length_sec || 24) / clipSeconds));

  return `너는 ChatGPT 이미지 프롬프트 스튜디오 + Higgsfield 영상 프롬프트 스튜디오를 동시에 운영하는 프로덕션 디자이너다.

[컨셉]
제목: ${concept.title}
로그라인: ${concept.logline}
장르: ${concept.genre}
포맷: ${concept.format}, 총 길이 ${concept.length_sec}초, 클립 ${clipCount}개 (클립당 ${clipSeconds}초 기준)

[선택된 Hook]
유형: ${hook?.type || '미정'}
화면 텍스트: ${hook?.hook_text || ''}
내레이션: ${hook?.narration || ''}

[Higgsfield 모드]: ${higgsfieldMode || 'CINEMATIC'} (STABLE=안정적 일관성 우선, CINEMATIC=영화적 연출, VIRAL=빠른 컷/강한 임팩트)

작업:
1. 먼저 GLOBAL VISUAL LOCK 하나를 만든다 — 모든 씬에 공통 적용될 캐릭터 외형/월드/아트 스타일/색감/카메라 톤을 고정하는 텍스트.
2. Hook을 반영한 씬을 ${clipCount}개로 분할한다 (Story Engine): 0~1초, 1~3초, 3~6초, 6~...초 구조를 참고해 Retention을 설계한다.
3. 각 씬마다 ChatGPT 이미지 생성용 프롬프트(image_prompt)와 Higgsfield 영상 생성용 프롬프트(higgsfield_prompt)를 각각 완전한 한 문단으로 작성한다. Higgsfield 프롬프트에는 duration, subject, action, camera, camera movement, environment, lighting, pacing, transition, ending frame, continuity, negative constraints를 문장 안에 자연스럽게 녹인다.

출력은 아래 JSON 스키마만 허용된다. 설명 문장 없이 JSON만 출력해라.

{
  "global_visual_lock": "...",
  "scenes": [
    {
      "scene_number": 1,
      "duration_sec": 8,
      "purpose": "이 씬의 스토리 기능 (Hook/전개/반전/Payoff 등)",
      "image_prompt": "ChatGPT 이미지 생성용 완전한 프롬프트 (영어 권장)",
      "higgsfield_prompt": "Higgsfield 영상 생성용 완전한 프롬프트 (영어 권장, duration/camera/action/lighting/transition 포함)"
    }
  ]
}

원본 트렌드나 다른 크리에이터의 음원·영상을 그대로 재현하지 마라. 모든 비주얼은 오리지널이어야 한다.`;
}
