import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Detects abrupt pixel-level changes (cuts, hard transitions) via ffmpeg's
// `scene` score. This is a PIXEL CHANGE signal, not scene "understanding" —
// callers must label it VISUAL_CHANGE_SIGNAL and never claim it means the
// story changed (spec section 6).
export async function detectVisualChangeSignals(absolutePath, threshold = 0.25) {
  const args = ['-i', absolutePath, '-vf', `select='gt(scene,${threshold})',showinfo`, '-f', 'null', '-'];
  let stderr = '';
  try {
    ({ stderr } = await execFileAsync('ffmpeg', args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }));
  } catch (err) {
    // ffmpeg with -f null exits non-zero occasionally even on success paths;
    // showinfo output is on stderr either way, so recover it from the error.
    stderr = err.stderr || '';
  }

  const signals = [];
  const lineRe = /pts_time:([\d.]+)/g;
  let match;
  while ((match = lineRe.exec(stderr)) !== null) {
    signals.push({
      timestamp_sec: Number(match[1]),
      type: 'VISUAL_CHANGE_SIGNAL',
      strength: 'MEDIUM',
      source: `ffmpeg scene-score>${threshold}`,
      confidence: 'MEASURED',
    });
  }
  return signals;
}

// Real silence + loudness measurement via ffmpeg's own filters. No inferred
// "impact points" beyond what silencedetect/volumedetect actually reports.
export async function detectAudioSignals(absolutePath) {
  const args = [
    '-i', absolutePath,
    '-af', 'silencedetect=noise=-30dB:d=0.3,volumedetect',
    '-f', 'null', '-',
  ];
  let stderr = '';
  try {
    ({ stderr } = await execFileAsync('ffmpeg', args, { timeout: 30000, maxBuffer: 10 * 1024 * 1024 }));
  } catch (err) {
    stderr = err.stderr || '';
  }

  const signals = [];
  const silenceStartRe = /silence_start: ([\d.]+)/g;
  const silenceEndRe = /silence_end: ([\d.]+)/g;
  let m;
  while ((m = silenceStartRe.exec(stderr)) !== null) {
    signals.push({ timestamp_sec: Number(m[1]), type: 'AUDIO_SILENCE_START', strength: 'LOW', source: 'ffmpeg silencedetect', confidence: 'MEASURED' });
  }
  while ((m = silenceEndRe.exec(stderr)) !== null) {
    signals.push({ timestamp_sec: Number(m[1]), type: 'AUDIO_SILENCE_END', strength: 'LOW', source: 'ffmpeg silencedetect', confidence: 'MEASURED' });
  }

  const meanMatch = /mean_volume:\s*(-?[\d.]+)\s*dB/.exec(stderr);
  const maxMatch = /max_volume:\s*(-?[\d.]+)\s*dB/.exec(stderr);

  return {
    signals: signals.sort((a, b) => a.timestamp_sec - b.timestamp_sec),
    meanVolumeDb: meanMatch ? Number(meanMatch[1]) : null,
    maxVolumeDb: maxMatch ? Number(maxMatch[1]) : null,
  };
}
