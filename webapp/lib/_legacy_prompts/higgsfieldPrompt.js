import { HIGGSFIELD_MODELS, recommendModel } from '../scoring';

// Ports prompts/chatgpt/trend-to-higgsfield-prompt.md's master prompt.
export function buildHiggsfieldMasterPrompt({ trendSummary, reinterpretation, characterRef, format }) {
  const aspect = format === 'longform' ? '16:9' : '9:16';
  return `너는 Higgsfield AI 영상 생성 요청을 설계하는 전문가다.
아래 트렌드 재해석안을 바탕으로, Higgsfield에 바로 제출 가능한 영상 생성 요청을 샷 단위로 설계해라.

[트렌드 요약]: ${trendSummary || '(없음)'}
[재해석안]: ${reinterpretation || '(없음)'}
[캐릭터/에셋]: ${characterRef || '(없음 - 신규 캐릭터 없이 비주얼 중심)'}
[목표 포맷]: ${format === 'longform' ? '16:9 Long-form 3~8분' : '9:16 Shorts 15~30초'}

각 샷마다 아래 JSON 스키마를 정확히 채워서 출력해라. 텍스트 설명 없이 JSON 배열만 출력한다.

{
  "shot_number": 1,
  "model": "<seedance_2_0 | seedance_2_0_mini | kling3_0 | minimax_h3 중 기준에 따라 선택>",
  "prompt": "<카메라 앵글, 인물/사물 행동, 배경, 조명, 분위기, 아트 스타일을 포함한 완전한 영어 프롬프트 한 문장~두 문장>",
  "aspect_ratio": "${aspect}",
  "duration": <모델 허용 범위 내 초 단위 정수>,
  "medias": [{"role": "image_references 또는 start_image", "value": "<캐릭터 레퍼런스 media_id 자리표시자, 없으면 빈 배열>"}],
  "notes": "<원본 트렌드에서 차용한 후킹 구조가 이 샷에 어떻게 반영됐는지 1줄>"
}

모델 선택 기준 (반드시 아래 규칙을 따를 것):
- 캐릭터 일관성(레퍼런스 이미지 기반) 유지가 필요하면 → seedance_2_0 (표준) 또는 seedance_2_0_mini (예산/속도 우선, 480~720p만)
- 여러 샷을 이어붙이는 시네마틱 멀티샷 + 오디오/모션 트랜스퍼가 필요하면 → kling3_0
- 2K 키프레임 품질이나 이미지/영상/오디오 레퍼런스를 복합적으로 쓰면 → minimax_h3
- 원본 음원/영상을 그대로 재현하지 말 것 - prompt 필드에는 항상 우리 오리지널 캐릭터/비주얼만 묘사한다.

출력은 유효한 JSON만 허용된다. 설명 문장을 JSON 앞뒤에 붙이지 마라.`;
}

// Deterministic local builder: converts scene shots (from sceneGeneration output)
// into a Higgsfield-ready request JSON without requiring a live GPT call.
export function buildHiggsfieldRequestFromShots(shots, opts) {
  const {
    format = 'shorts',
    styleLock = '',
    needsCharacterConsistency = true,
    needsMultiShotCinematic = false,
    needs2K = false,
    budgetPriority = false,
    characterMediaId = '',
  } = opts || {};

  const aspect_ratio = format === 'longform' ? '16:9' : '9:16';
  const model = recommendModel({ needsCharacterConsistency, needsMultiShotCinematic, needs2K, budgetPriority });
  const modelInfo = HIGGSFIELD_MODELS.find((m) => m.id === model);
  const [minDur, maxDur] = modelInfo ? modelInfo.duration : [4, 15];

  return shots.map((shot, idx) => {
    const duration = Math.min(Math.max(Number(shot.duration_sec) || 5, minDur), maxDur);
    const styleSuffix = styleLock ? `, ${styleLock}` : '';
    return {
      shot_number: shot.shot_number || idx + 1,
      model,
      prompt: `${shot.visual_description || ''}${styleSuffix}`.trim(),
      aspect_ratio,
      duration,
      medias: characterMediaId
        ? [{ role: 'image_references', value: characterMediaId }]
        : [],
      notes: shot.narration ? `내레이션: ${shot.narration}` : '',
    };
  });
}

export function guideForRequest(requestJson) {
  const models = [...new Set(requestJson.map((s) => s.model))];
  return {
    models,
    steps: [
      '1. 각 샷의 model/prompt/aspect_ratio/duration/medias 값을 확인한다.',
      '2. 캐릭터가 등장하는 시리즈라면 medias.value 자리에 실제 캐릭터 레퍼런스 media_id를 채운다 (Higgsfield에서 이미지 업로드 후 발급).',
      '3. Higgsfield 앱에서: 좌측 모델 선택 → 위 model과 동일한 모델 선택 → prompt 붙여넣기 → aspect ratio/duration 설정 → 레퍼런스 이미지 업로드(medias 필요 시) → 생성.',
      '4. Claude Code(Higgsfield MCP)를 쓴다면: generate_video 호출 시 params에 이 JSON 객체의 model/prompt/aspect_ratio/duration/medias를 그대로 전달한다. 제출 전 get_cost:true로 크레딧을 먼저 확인한다.',
      '5. 생성 결과를 검수하고, 실제 사용한 model/aspect_ratio/duration/크레딧을 production_tracker에 기록한다.',
    ],
  };
}
