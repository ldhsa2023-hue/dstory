import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs';
import path from 'path';
import { buildRenderManifest } from './manifest';
import { buildFfmpegArgs } from './ffmpegCompiler';
import { probeFile } from '../media/ffprobe';
import { exportDir } from '../media/paths';
import { insertRenderJob, updateRenderJob } from '../db/repo';

const execFileAsync = promisify(execFile);

export async function runRender({ production, assets, captionTrack, effectTrack, editPlan, hookText, preset }) {
  const manifest = buildRenderManifest({ production, assets, captionTrack, editPlan, hookText, preset });

  const effects = effectTrack?.effects || [];
  if (effects.length > 0) {
    manifest.warnings.push(
      `Effect Track에 ${effects.length}개 효과가 있지만, 이 로컬 렌더러는 아직 적용하지 않습니다 (SIMPLIFIED — Punch Zoom/Speed Ramp 등은 다음 버전 과제).`
    );
  }

  const job = insertRenderJob({ production_id: production.id, preset, status: 'QUEUED', manifest });

  if (manifest.clips.length === 0) {
    return updateRenderJob(job.id, {
      status: 'FAILED',
      error: '연결된 클립이 없어 렌더를 실행할 수 없습니다.',
      completed_at: new Date().toISOString(),
    });
  }

  const outFilename = preset === 'FINAL' ? 'final-short.mp4' : 'preview.mp4';
  const outputPath = path.join(exportDir(production.id), outFilename);
  const ffmpegArgs = buildFfmpegArgs(manifest, outputPath);

  updateRenderJob(job.id, { status: 'RENDERING', ffmpeg_args: ffmpegArgs, started_at: new Date().toISOString() });

  const startedAt = Date.now();
  try {
    await execFileAsync('ffmpeg', ffmpegArgs, { timeout: 5 * 60 * 1000, maxBuffer: 20 * 1024 * 1024 });
  } catch (err) {
    return updateRenderJob(job.id, {
      status: 'FAILED',
      error: `FFmpeg 렌더 실패: ${(err.stderr || err.message || '').toString().slice(-2000)}`,
      completed_at: new Date().toISOString(),
    });
  }
  const renderTimeMs = Date.now() - startedAt;

  let outProbe = {};
  try {
    outProbe = await probeFile(outputPath);
  } catch (err) {
    manifest.warnings.push(`출력 파일 검증(ffprobe) 실패: ${err.message}`);
  }

  let fileSize = null;
  try {
    fileSize = fs.statSync(outputPath).size;
  } catch {
    // ignore
  }

  const report = {
    output_resolution: outProbe.width && outProbe.height ? `${outProbe.width}x${outProbe.height}` : 'UNKNOWN',
    fps: outProbe.fps || manifest.fps,
    duration_sec: outProbe.duration_sec || manifest.duration_sec,
    video_codec: outProbe.codec || 'UNKNOWN',
    has_audio: outProbe.hasAudio ?? null,
    file_size_bytes: fileSize,
    render_time_ms: renderTimeMs,
    warnings: manifest.warnings,
    missing_assets: manifest.warnings.filter((w) => w.includes('클립이 없')),
    decision_report: manifest.decision_report,
  };

  return updateRenderJob(job.id, {
    status: 'COMPLETED',
    output_path: outputPath,
    report,
    completed_at: new Date().toISOString(),
  });
}
