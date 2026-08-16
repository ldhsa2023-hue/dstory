export function buildAutoEditPrompt({ production, signalMap, hook, captionTrack, effectTrack, intensity, hookReadiness }) {
  const signalMapText = signalMap
    .map((s) => `[${s.id}] t=${s.timestamp_sec}s type=${s.type} strength=${s.strength} source="${s.source}" confidence=${s.confidence}`)
    .join('\n');

  const captionsText = (captionTrack?.captions || [])
    .map((c) => `${c.start_sec}-${c.end_sec}s [${c.type}] "${c.text}"`)
    .join('\n');

  const existingEffectsText = (effectTrack?.effects || [])
    .map((e) => `${e.start_sec}-${e.end_sec}s ${e.type} (${e.purpose})`)
    .join('\n');

  return `너는 Auto Edit Director다. 실제로 측정되지 않은 타임스탬프를 만들지 않는다.

[영상 총 길이]: ${production.target_duration}초
[Edit Intensity]: ${intensity} (MINIMAL=최소 개입, BALANCED=적정, AGGRESSIVE=바이럴형 과감)
[Hook Readiness]: ${hookReadiness?.available ? `${hookReadiness.readiness_score}/100 ${hookReadiness.weak_opening ? '(약한 오프닝 경고)' : ''}` : '분석 안됨'}
[선택된 Hook]: ${hook ? `${hook.type} - "${hook.hook_text}"` : '없음'}

[실측 Timeline Signal Map — 이 목록에 있는 timestamp만 편집 결정의 근거로 사용할 수 있다. 여기 없는 시간대를 임의로 만들지 마라]
${signalMapText || '(측정된 신호 없음)'}

[기존 Caption Timeline — 참고만 하고 겹치지 않게 배치]
${captionsText || '(없음)'}

[기존 Effect Track — 이미 사람이 검토한 계획, 중복 제안하지 마라]
${existingEffectsText || '(없음)'}

작업: 위 Signal Map에 있는 timestamp(또는 CLIP_BOUNDARY 지점)를 앵커로 삼아 편집 결정을 만들어라. 가능한 타입: CUT, TRIM, PACE_NOTE, PUNCH_ZOOM, MICRO_ZOOM, SPEED_RAMP, FREEZE, IMPACT_SFX_CUE, MUSIC_CUE, HOOK_TEXT_TIMING, TRANSITION, LOOP_SUGGESTION, PAYOFF_EMPHASIS.

각 결정은 반드시 signalIds에 위 Signal Map의 실제 id를 1개 이상 포함해야 한다 (근거 없는 결정 금지). Signal Map에 뒷받침하는 신호가 약하면 confidence를 LOW로 낮춰라.

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "decisions": [
    {
      "timestamp": 0.0,
      "endTimestamp": 0.5,
      "track": "V1 | V2 | T1 | T2 | FX | A1 | A2 | A3 | A4",
      "type": "CUT | TRIM | PUNCH_ZOOM | MICRO_ZOOM | SPEED_RAMP | FREEZE | IMPACT_SFX_CUE | MUSIC_CUE | HOOK_TEXT_TIMING | TRANSITION | LOOP_SUGGESTION | PAYOFF_EMPHASIS",
      "parameters": { "strength": "LOW | MEDIUM | HIGH" },
      "reason": "왜 이 결정을 내렸는지 1문장 (Signal Map의 근거를 인용)",
      "signalIds": ["sig-1-0.43-VISUAL_CHANGE_SIGNAL"],
      "confidence": "HIGH | MEDIUM | LOW",
      "enabled": true
    }
  ]
}`;
}
