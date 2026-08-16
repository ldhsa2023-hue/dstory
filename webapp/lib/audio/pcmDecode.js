import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Decodes any audio file ffmpeg can read into mono 22050Hz 32-bit float PCM,
// following the same execFile + argument-array pattern as
// lib/media/signalAnalysis.js (never a shell string). 100MB maxBuffer caps
// safely-decodable length at ~19 minutes (22050 * 4 bytes/sample) — long
// enough for any channel music track, but a real limit worth documenting.
export async function decodePcm(absolutePath, { sampleRate = 22050 } = {}) {
  const args = ['-i', absolutePath, '-f', 'f32le', '-ac', '1', '-ar', String(sampleRate), 'pipe:1'];
  let stdout;
  try {
    ({ stdout } = await execFileAsync('ffmpeg', args, {
      timeout: 60000,
      maxBuffer: 100 * 1024 * 1024,
      encoding: 'buffer',
    }));
  } catch (err) {
    throw new Error(`ffmpeg PCM 디코드 실패: ${err.message}`);
  }
  // .slice() copies into a fresh ArrayBuffer so alignment/pooling of the
  // underlying Buffer can never corrupt the Float32Array view.
  const arrayBuffer = stdout.buffer.slice(stdout.byteOffset, stdout.byteOffset + stdout.length);
  const samples = new Float32Array(arrayBuffer);
  return { samples, sampleRate };
}
