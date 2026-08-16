import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'path';

const execFileAsync = promisify(execFile);

// Extracts representative frames — start/25%/50%/75%/end plus any extra
// (e.g. detected scene-change) timestamps — as real JPEGs. Nothing here
// describes *content*; that's ClaudeVisualProvider's job, working from
// these actual files.
export async function extractKeyframes(absolutePath, durationSec, outDir, extraTimestamps = []) {
  const dur = durationSec || 1;
  const base = [
    { t: 0, label: 'start' },
    { t: dur * 0.25, label: '25%' },
    { t: dur * 0.5, label: '50%' },
    { t: dur * 0.75, label: '75%' },
    { t: Math.max(0, dur - 0.15), label: 'end' },
  ];
  const extras = extraTimestamps
    .filter((t) => t > 0.2 && t < dur - 0.2)
    .map((t) => ({ t, label: `scene_change_${t.toFixed(2)}` }));

  const targets = [...base, ...extras];
  const keyframes = [];

  for (const { t, label } of targets) {
    const filename = `${label}_${t.toFixed(2)}s.jpg`;
    const outPath = path.join(outDir, filename);
    const args = ['-ss', String(t), '-i', absolutePath, '-frames:v', '1', '-q:v', '3', '-y', outPath];
    try {
      await execFileAsync('ffmpeg', args, { timeout: 15000 });
      keyframes.push({ timestamp_sec: Number(t.toFixed(2)), path: outPath, label });
    } catch {
      // A single frame extraction failing (e.g. timestamp past EOF) doesn't
      // fail the whole analysis — just skip that one keyframe.
    }
  }
  return keyframes;
}

export async function buildContactSheet(keyframes, outputPath) {
  if (keyframes.length === 0) return null;
  const args = [];
  keyframes.forEach((k) => args.push('-i', k.path));
  const labels = keyframes.map((_, i) => `[${i}:v]`).join('');
  const filter = `${labels}hstack=inputs=${keyframes.length}[out]`;
  args.push('-filter_complex', filter, '-map', '[out]', '-y', outputPath);
  try {
    await execFileAsync('ffmpeg', args, { timeout: 20000 });
    return outputPath;
  } catch {
    return null;
  }
}
