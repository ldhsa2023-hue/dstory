import { ZOOM_TYPES, zoomFactorFor, speedFactorFor } from './editApply';
import { resolveKoreanCapableFont } from './fontResolver';

// Compiles a render manifest into an FFmpeg argument ARRAY (never a shell
// string) so nothing in a filename or path can be interpreted as an extra
// flag or a second command — see lib/media/paths.js for the matching
// upload-side filename allowlisting.
//
// Simplified vs. the full spec (per its own "don't force unstable effects"
// rule, section 56): original clip audio is dropped and replaced entirely
// by the music track (or silence if none was uploaded), and clip-to-clip
// transitions are hard cuts only (no xfade). What IS applied now, when an
// Edit Plan is attached to the manifest (see lib/render/editApply.js):
// PUNCH_ZOOM/MICRO_ZOOM/PAYOFF_EMPHASIS (static scale+crop zoom on a
// segment), SPEED_RAMP (setpts), FREEZE (tpad hold), TRIM (segment dropped
// from the concat entirely), and HOOK_TEXT_TIMING (drawtext overlay).
// Everything else an Edit Plan can contain (CUT, TRANSITION, IMPACT_SFX_CUE,
// MUSIC_CUE, LOOP_SUGGESTION) is intentionally not realized as a filter —
// manifest.decision_report says why for each one.
export function buildFfmpegArgs(manifest, outputPath) {
  const {
    clips,
    canvas,
    fps,
    crf,
    encode_preset: preset,
    captions_path: captionsPath,
    music,
    duration_sec: durationSec,
    text_overlays: textOverlays,
  } = manifest;
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
  const videoFilters = clips.map((c, i) => buildClipVideoFilter(c, i, fps, width, height));
  const concatFilter = `${videoLabels.join('')}concat=n=${clips.length}:v=1:a=0[vcat]`;

  let videoOutLabel = '[vcat]';
  let subtitleFilter = '';
  if (captionsPath) {
    subtitleFilter = `[vcat]subtitles=${escapeFilterPath(captionsPath)}[vout]`;
    videoOutLabel = '[vout]';
  }

  const textFilters = [];
  const koreanFont = resolveKoreanCapableFont();
  const fontOption = koreanFont ? `fontfile=${escapeFilterPath(koreanFont)}:` : '';
  // Scaled to canvas height rather than a fixed pixel size, since PREVIEW
  // (e.g. 960px tall) and FINAL (1920px) canvases differ 2x — a fixed size
  // that looked right in one preset overflowed the frame in the other.
  // drawtext still doesn't wrap long text onto multiple lines, so a long
  // hook can still run off the sides at this size; that's a known limit,
  // not something worth a hand-rolled line-wrapper for.
  const fontSize = Math.round(height * 0.035);
  (textOverlays || []).forEach((overlay, k) => {
    const nextLabel = `[textout${k}]`;
    textFilters.push(
      `${videoOutLabel}drawtext=${fontOption}text=${escapeDrawtext(overlay.text)}:expansion=none:fontsize=${fontSize}:fontcolor=white:` +
        `borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.15:enable='between(t\\,${overlay.start}\\,${overlay.end})'${nextLabel}`
    );
    videoOutLabel = nextLabel;
  });

  const fadeIn = 1;
  const fadeOut = Math.min(1, Math.max(0.1, durationSec - 0.1));
  const fadeOutStart = Math.max(0, durationSec - fadeOut);
  const audioFilter =
    `[${musicIndex}:a]atrim=0:${durationSec},asetpts=PTS-STARTPTS,` +
    `afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},volume=${music ? 0.85 : 1}[aout]`;

  const filterComplex = [...videoFilters, concatFilter, subtitleFilter, ...textFilters, audioFilter]
    .filter(Boolean)
    .join(';');

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
    '-t', String(durationSec),
    '-y',
    outputPath
  );

  return args;
}

// Builds the filter chain for a single clip input, ending in the same
// `[v{index}]` normalized label the concat step expects — whether or not
// this clip has any Edit Plan segments applied.
function buildClipVideoFilter(clip, index, fps, width, height) {
  const normalize = (inputLabel) =>
    `${inputLabel}scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p[v${index}]`;

  const segments = clip.segments || [];
  const kept = segments.filter((seg) => seg.effect?.type !== 'TRIM');
  if (segments.length === 0 || kept.length === 0) {
    return normalize(`[${index}:v]`);
  }

  const clauses = [];
  const segLabels = kept.map((seg, j) => {
    const label = `[c${index}s${j}]`;
    clauses.push(buildSegmentClause(seg, index, label, fps));
    return label;
  });

  let editedLabel = segLabels[0];
  if (segLabels.length > 1) {
    editedLabel = `[cedit${index}]`;
    clauses.push(`${segLabels.join('')}concat=n=${segLabels.length}:v=1:a=0${editedLabel}`);
  }
  clauses.push(normalize(editedLabel));
  return clauses.join(';');
}

function buildSegmentClause(seg, clipIndex, outLabel, fps) {
  const input = `[${clipIndex}:v]`;
  const effectType = seg.effect?.type;

  if (effectType === 'FREEZE') {
    const holdFrame = 1 / fps;
    const frameEnd = Math.min(seg.end, seg.start + holdFrame);
    const stopDuration = Math.max(0, seg.end - seg.start - holdFrame);
    return `${input}trim=start=${seg.start}:end=${frameEnd},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${stopDuration.toFixed(3)}${outLabel}`;
  }
  if (effectType === 'SPEED_RAMP') {
    const factor = speedFactorFor(seg.effect.parameters?.strength);
    return `${input}trim=start=${seg.start}:end=${seg.end},setpts=(PTS-STARTPTS)/${factor}${outLabel}`;
  }
  if (effectType && ZOOM_TYPES.has(effectType)) {
    const zoom = zoomFactorFor(seg.effect.parameters?.strength);
    return `${input}trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS,scale=iw*${zoom}:ih*${zoom},crop=iw/${zoom}:ih/${zoom}${outLabel}`;
  }
  return `${input}trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS${outLabel}`;
}

function escapeFilterPath(p) {
  // ffmpeg filtergraph syntax treats ':' as an option separator inside a
  // filter's argument list, so it must be escaped even though this never
  // touches a shell.
  const escaped = p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function escapeDrawtext(text) {
  const escaped = String(text)
    .replace(/\\/g, '\\\\\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\u2019")
    .replace(/%/g, '\\%');
  return `'${escaped}'`;
}
