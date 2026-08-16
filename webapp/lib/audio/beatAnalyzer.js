// Local, dependency-free onset/BPM estimation — an energy-based onset
// detector + inter-onset-interval histogram, not a spectral-flux/complex-
// domain beat tracker like librosa/madmom. It will under-perform on tracks
// with soft attacks (pads, ambient) or very syncopated percussion. This
// limitation is surfaced honestly in the returned `method` string and in
// `confidence`, never hidden behind a falsely precise BPM.

const HOP_SEC = 0.01; // 10ms hop
const WINDOW_SEC = 0.02; // 20ms window
const MIN_ONSET_GAP_SEC = 0.1; // refuse to double-trigger within 100ms
const MIN_BPM = 60;
const MAX_BPM = 200;

function computeEnergyEnvelope(samples, sampleRate) {
  const hop = Math.max(1, Math.round(sampleRate * HOP_SEC));
  const window = Math.max(1, Math.round(sampleRate * WINDOW_SEC));
  const envelope = [];
  for (let start = 0; start + window <= samples.length; start += hop) {
    let sumSq = 0;
    for (let i = start; i < start + window; i++) sumSq += samples[i] * samples[i];
    envelope.push(Math.sqrt(sumSq / window));
  }
  return envelope;
}

function computeOnsetFunction(envelope) {
  const odf = [0];
  for (let i = 1; i < envelope.length; i++) {
    odf.push(Math.max(0, envelope[i] - envelope[i - 1]));
  }
  // light 3-tap smoothing to reduce single-sample noise spikes
  return odf.map((v, i) => {
    const prev = odf[i - 1] ?? v;
    const next = odf[i + 1] ?? v;
    return (prev + v + next) / 3;
  });
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

function stddev(arr, avg) {
  return Math.sqrt(mean(arr.map((v) => (v - avg) ** 2)));
}

function pickPeaks(odf) {
  const avg = mean(odf);
  const sd = stddev(odf, avg);
  const threshold = avg + sd;
  const minGapSamples = Math.round(MIN_ONSET_GAP_SEC / HOP_SEC);

  const peaks = [];
  let lastPeakIdx = -Infinity;
  for (let i = 1; i < odf.length - 1; i++) {
    // odf[i] > 0 (strict) guards against flat/silent input, where every
    // sample ties at exactly 0 and would otherwise all pass a `< threshold`
    // check once threshold itself degenerates to 0.
    if (odf[i] <= 0 || odf[i] < threshold) continue;
    if (odf[i] < odf[i - 1] || odf[i] < odf[i + 1]) continue;
    if (i - lastPeakIdx < minGapSamples) continue;
    peaks.push(i);
    lastPeakIdx = i;
  }
  return peaks.map((i) => Number((i * HOP_SEC).toFixed(3)));
}

function estimateBpm(onsetTimes) {
  const minIoi = 60 / MAX_BPM;
  const maxIoi = 60 / MIN_BPM;
  const iois = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const gap = onsetTimes[i] - onsetTimes[i - 1];
    if (gap >= minIoi && gap <= maxIoi) iois.push(gap);
  }
  if (iois.length === 0) return { bpm: null, confidence: 'LOW', matchedRatio: 0 };

  // Histogram with 0.02s bins, find the modal bin.
  const binWidth = 0.02;
  const bins = new Map();
  for (const ioi of iois) {
    const bin = Math.round(ioi / binWidth) * binWidth;
    bins.set(bin, (bins.get(bin) || 0) + 1);
  }
  let modalBin = null;
  let modalCount = 0;
  for (const [bin, count] of bins) {
    if (count > modalCount) {
      modalBin = bin;
      modalCount = count;
    }
  }
  const nearModal = iois.filter((ioi) => Math.abs(ioi - modalBin) / modalBin <= 0.05).length;
  const matchedRatio = nearModal / iois.length;
  const bpm = Math.round((60 / modalBin) * 10) / 10;

  let confidence = 'LOW';
  if (matchedRatio > 0.5) confidence = 'HIGH';
  else if (matchedRatio >= 0.25) confidence = 'MEDIUM';

  return { bpm, confidence, matchedRatio: Number(matchedRatio.toFixed(2)) };
}

export function analyzeBeat(samples, sampleRate) {
  const envelope = computeEnergyEnvelope(samples, sampleRate);
  const odf = computeOnsetFunction(envelope);
  const onsetTimes = pickPeaks(odf);
  const durationSec = Number((samples.length / sampleRate).toFixed(2));

  if (onsetTimes.length < 8) {
    return {
      bpm: null,
      confidence: 'LOW',
      onsetTimes,
      onsetCount: onsetTimes.length,
      durationSec,
      method:
        '로컬 에너지 기반 온셋 검출 (근사치 — 전문 비트 트래킹 라이브러리 아님). 온셋이 8개 미만으로 감지되어 BPM을 산출하지 않음(추측 대신 정직하게 미산출).',
    };
  }

  const { bpm, confidence, matchedRatio } = estimateBpm(onsetTimes);
  return {
    bpm,
    confidence,
    onsetTimes,
    onsetCount: onsetTimes.length,
    durationSec,
    method: `로컬 에너지 기반 온셋 검출 + IOI 히스토그램 (근사치 — 전문 비트 트래킹 라이브러리 아님, 타악기가 약한 트랙에서 정확도가 떨어질 수 있음). 최빈 간격 근처(±5%) 온셋 비율 ${matchedRatio != null ? Math.round(matchedRatio * 100) : '?'}%.`,
  };
}
