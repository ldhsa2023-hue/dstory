export function buildHookPrompt({ concept }) {
  return `너는 Shorts Hook 전문 카피라이터다.
아래 컨셉을 위한 Hook 후보를 최소 10개 만들어라. 서로 다른 Hook 유형을 사용해라.

[컨셉]
제목: ${concept.title}
로그라인: ${concept.logline}
장르: ${concept.genre}
길이: ${concept.length_sec}초

Hook 유형(최소 6종 이상 섞어서 사용): VISUAL SHOCK, CURIOSITY, RESULT FIRST, EMOTIONAL, IMPOSSIBLE, QUESTION, CONFLICT, MYSTERY, COUNTDOWN, PATTERN BREAK.

각 Hook은 아래 JSON 스키마를 따른다. 설명 문장 없이 JSON 배열만 출력해라.

[
  {
    "type": "CURIOSITY",
    "hook_text": "화면에 표시될 짧은 텍스트 (3~10 단어, 없으면 빈 문자열)",
    "narration": "내레이션으로 사용할 경우의 문장 (없으면 빈 문자열)",
    "scores": {
      "stop_power": 1,
      "curiosity": 1,
      "clarity": 1,
      "visual_strength": 1,
      "emotional_strength": 1,
      "retention_setup": 1,
      "higgsfield_feasibility": 1
    }
  }
]

scores 값은 1~5 정수. 영상에서 실제로 보여주지 못할 결과를 약속하는 Hook은 만들지 마라.`;
}
