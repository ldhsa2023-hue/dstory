// Compiles a render manifest into an FFmpeg argument ARRAY (never a shell
// string) so nothing in a filename or path can be interpreted as an extra
// flag or a second command — see lib/media/paths.js for the matching
// upload-side filename allowlisting.
//
// Deliberately simplified vs. the full spec (per its own "don't force
// unstable effects" rule, section 56): original clip audio is dropped and
// replaced entirely by the music track (or silence if none was uploaded),
// hard cuts only (no transitions), and Effect Track entries are NOT applied
// to the render — they are marked SIMPLIFIED in the render report instead of
// risking a broken filter graph.
export function buildFfmpegArgs(manifest, outputPath) {
  const { clips, canvas, fps, crf, encode_preset: preset, captions_path: captionsPath, music, duration_sec } = manifest;
  const { width, height } = canvas;

  const args = [];
  clips.forEach((c) => {
    args.push('-i', c.path);
  });

  const musicIndex = clips.length;
  if (music) {
    args.push('-i', music.path);
  } else {
    args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100');
  }

  const videoLabels = clips.map((_, i) => `[v${i}]`);
  const videoFilters = clips.map(
    (_, i) =>
      `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p[v${i}]`
  );
  const concatFilter = `${videoLabels.join('')}concat=n=${clips.length}:v=1:a=0[vcat]`;

  let videoOutLabel = '[vcat]';
  let subtitleFilter = '';
  if (captionsPath) {
    subtitleFilter = `[vcat]subtitles=${escapeFilterPath(captionsPath)}[vout]`;
    videoOutLabel = '[vout]';
  }

  const fadeIn = 1;
  const fadeOut = Math.min(1, Math.max(0.1, duration_sec - 0.1));
  const fadeOutStart = Math.max(0, duration_sec - fadeOut);
  const audioFilter =
    `[${musicIndex}:a]atrim=0:${duration_sec},asetpts=PTS-STARTPTS,` +
    `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},volume=${music ? 0.85 : 1}[aout]`;

  const filterComplex = [...videoFilters, concatFilter, subtitleFilter, audioFilter].filter(Boolean).join(';');

  args.push(
    '-filter_complex', filterComplex,
    '-map', videoOutLabel,
    '-map', '[aout]',
    '-r', String(fps),
    '-c:v', 'libx264',
    '-preset', preset,
    '-crf', String(crf),
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-t', String(duration_sec),
    '-y',
    outputPath
  );

  return args;
}

function escapeFilterPath(p) {
  // ffmpeg filtergraph syntax treats ':' as an option separator inside a
  // filter's argument list, so it must be escaped even though this never
  // touches a shell.
  const escaped = p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `'${escaped}'`;
}
