// Ports prompts/chatgpt/script-writing.md + trend-analysis.md step 3 into a fillable template.
// Produces the GPT prompt used to generate scene/shot breakdowns + illustration prompts for a video.
export function buildSceneGenerationPrompt({
  logline,
  genreLabel,
  format, // 'shorts' | 'longform'
  characterRef,
  reinterpretation,
  shotCountHint,
}) {
  const lengthSpec =
    format === 'longform'
      ? '3~8분 Long-form, 15~25개 샷'
      : '15~30초 Shorts, 3~5개 샷 (샷당 4~8초)';

  return `너는 AI 생성 영상용 씬(장면) 및 삽화 연출 설계자다.

[장르]: ${genreLabel || '미지정'}
[포맷]: ${lengthSpec}
[로그라인]: ${logline || '(로그라인을 입력하세요)'}
[기존 캐릭터/세계관]: ${characterRef || '(없음 - 신규 캐릭터 없이 비주얼 중심으로 구성)'}
[트렌드 재해석 메모]: ${reinterpretation || '(없음 - 일반 기획)'}

아래 구조로 샷 리스트를 설계해라 (총 ${shotCountHint || '포맷 기준'}개 내외):
- 구조: 1~3초 Hook → 상황 제시 → 전개(중반 이탈 방지용 반전/질문 배치) → 클라이맥스 → 클리프행어/마무리
- 각 샷마다:
  1) 샷 번호 및 길이(초)
  2) 화면에 보이는 것 (인물, 행동, 배경, 카메라 앵글, 조명, 분위기 - Higgsfield 삽화/영상 생성 프롬프트로 바로 쓸 수 있도록 구체적으로)
  3) 내레이션/대사
  4) 자막 텍스트

출력은 JSON 배열로만 작성해라. 각 원소는 다음 스키마를 따른다:
{
  "shot_number": number,
  "duration_sec": number,
  "visual_description": "카메라 앵글, 행동, 배경, 조명, 분위기를 포함한 구체적 묘사(영어 권장)",
  "narration": "내레이션/대사",
  "subtitle": "자막 텍스트"
}

설명 문장 없이 유효한 JSON 배열만 출력해라.`;
}
