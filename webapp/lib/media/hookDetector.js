// Hook readiness scoring — a transparent formula over real measurements
// (visual-change / audio-silence signals actually detected in scene 1, plus
// Claude's real visual read of that clip's contact sheet), not a trained
// model. Explicitly documented limitation: our scene-change detector only
// catches abrupt pixel changes (cuts), not smooth continuous motion — a
// single unbroken AI-generated clip will often show zero signals here even
// if it's visually dynamic. Treat this as one input, not a verdict.
export function computeHookReadiness({ scene1Analysis, hook }) {
  if (!scene1Analysis) {
    return { available: false, note: 'Scene 1에 연결된 클립의 분석 결과가 없습니다. ANALYZE 탭에서 먼저 분석하세요.' };
  }

  const windows = [
    { range: '0-0.5s', from: 0, to: 0.5 },
    { range: '0.5-1s', from: 0.5, to: 1 },
    { range: '1-2s', from: 1, to: 2 },
    { range: '2-3s', from: 2, to: 3 },
  ].map((w) => {
    const signalsInWindow = (scene1Analysis.signals || []).filter((s) => s.timestamp_sec >= w.from && s.timestamp_sec < w.to);
    return { ...w, signal_count: signalsInWindow.length, signals: signalsInWindow.map((s) => s.type) };
  });

  const totalEarlySignals = windows.reduce((sum, w) => sum + w.signal_count, 0);
  const visualConfidence = scene1Analysis.visual_review?.confidence;
  const clarityScore = visualConfidence === 'HIGH' ? 5 : visualConfidence === 'MEDIUM' ? 3 : visualConfidence === 'LOW' ? 2 : 1;
  const stopPowerScore = Math.min(5, 1 + totalEarlySignals * 2);
  const hasHookText = Boolean(hook?.hook_text);
  const textSupportScore = hasHookText ? 5 : 2;

  const readiness = Math.round(((clarityScore + stopPowerScore + textSupportScore) / 15) * 100);

  return {
    available: true,
    windows,
    total_early_signals: totalEarlySignals,
    visual_review: scene1Analysis.visual_review,
    scores: { clarity: clarityScore, stop_power: stopPowerScore, text_support: textSupportScore },
    readiness_score: readiness,
    weak_opening: readiness < 50,
    method_note:
      '이 점수는 Scene 1 클립에서 실제로 측정된 픽셀 변화/무음 감지 신호와 Claude의 실제 프레임 판독을 조합한 투명 공식이다. 학습된 예측 모델이 아니며, 매끄러운 연속 동작(컷 없는 단일 샷)은 신호가 0으로 나올 수 있다는 한계가 있다.',
  };
}
