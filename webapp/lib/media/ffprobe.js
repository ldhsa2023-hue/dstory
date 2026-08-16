import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Runs ffprobe as an argument array (never a shell string) so a crafted
// filename can never be interpreted as extra flags or injected commands.
export async function probeFile(absolutePath) {
  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    absolutePath,
  ];

  let stdout;
  try {
    ({ stdout } = await execFileAsync('ffprobe', args, { timeout: 20000, maxBuffer: 5 * 1024 * 1024 }));
  } catch (err) {
    throw new Error(`ffprobe 실행 실패: ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error('ffprobe 출력 파싱 실패');
  }

  const videoStream = (data.streams || []).find((s) => s.codec_type === 'video');
  const audioStream = (data.streams || []).find((s) => s.codec_type === 'audio');

  const duration_sec = Number(data.format?.duration) || (videoStream ? Number(videoStream.duration) : null) || null;

  let fps = null;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den) fps = Math.round((num / den) * 100) / 100;
  }

  let rotation = null;
  const rotateTag = videoStream?.tags?.rotate;
  const displayMatrix = (videoStream?.side_data_list || []).find((s) => s.side_data_type === 'Display Matrix');
  if (rotateTag) rotation = Number(rotateTag);
  else if (displayMatrix?.rotation != null) rotation = Number(displayMatrix.rotation);

  return {
    duration_sec,
    width: videoStream?.width || null,
    height: videoStream?.height || null,
    fps,
    codec: videoStream?.codec_name || audioStream?.codec_name || null,
    hasVideo: Boolean(videoStream),
    hasAudio: Boolean(audioStream),
    formatName: data.format?.format_name || null,
    // extended fields (V3.2 media analysis)
    bitrate: Number(data.format?.bit_rate) || null,
    audioCodec: audioStream?.codec_name || null,
    sampleRate: audioStream?.sample_rate ? Number(audioStream.sample_rate) : null,
    channels: audioStream?.channels || null,
    rotation,
    frameCount: videoStream?.nb_frames ? Number(videoStream.nb_frames) : null,
    startTime: data.format?.start_time ? Number(data.format.start_time) : null,
  };
}

export async function isFfprobeAvailable() {
  try {
    await execFileAsync('ffprobe', ['-version'], { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}
