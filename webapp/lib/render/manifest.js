import fs from 'fs';
import path from 'path';
import { tempDir } from '../media/paths';
import { computeClipEdits, speedFactorFor } from './editApply';
import { resolveKoreanCapableFont } from './fontResolver';

const PRESETS = {
  PREVIEW: { width: 540, height: 960, fps: 24, crf: 30, encodePreset: 'ultrafast' },
  FINAL: { width: 1080, height: 1920, fps: 30, crf: 20, encodePreset: 'medium' },
};

const PRESETS_16_9 = {
  PREVIEW: { width: 960, height: 540, fps: 24, crf: 30, encodePreset: 'ultrafast' },
  FINAL: { width: 1920, height: 1080, fps: 30, crf: 20, encodePreset: 'medium' },
};

// Real wall-clock duration a clip will occupy in the final render once its
// segment edits are applied — TRIM removes the segment entirely, SPEED_RAMP
// compresses it by the chosen factor, everything else (FREEZE, zoom types,
// unedited segments) keeps its original length.
function effectiveClipDuration(clip) {
  const original = clip.actual_duration_sec || clip.planned_duration_sec || 0;
  if (!clip.segments || clip.segments.length === 0) return original;
  return clip.segments.reduce((sum, seg) => {
    const segLen = seg.end - seg.start;
    if (!seg.effect) return sum + segLen;
    if (seg.effect.type === 'TRIM') return sum;
    if (seg.effect.type === 'SPEED_RAMP') return sum + segLen / speedFactorFor(seg.effect.parameters?.strength);
    return sum + segLen;
  }, 0);
}

// Builds a render manifest from what actually exists in the DB — never
// invents a clip, caption, or music track that wasn't generated/uploaded.
export function buildRenderManifest({ production, assets, captionTrack, editPlan, hookText, preset }) {
  const warnings = [];
  const canvasTable = production.format === 'longform' ? PRESETS_16_9 : PRESETS;
  const canvas = canvasTable[preset] || canvasTable.PREVIEW;

  const videoAssets = assets.filter((a) => a.type === 'VIDEO_CLIP' && a.linked_scene_number != null);
  const byScene = new Map(videoAssets.map((a) => [a.linked_scene_number, a]));

  const storyboard = production.storyboard || [];
  const clips = [];
  if (storyboard.length === 0) {
    warnings.push('Storyboard가 없습니다. PROMPTS 탭에서 Prompt Pack을 먼저 생성하세요.');
  }
  for (const scene of storyboard) {
    const asset = byScene.get(scene.scene_number);
    if (!asset) {
      warnings.push(`Scene ${scene.scene_number}에 연결된 영상 클립이 없습니다 — 이 씬은 렌더에서 제외됩니다.`);
      continue;
    }
    clips.push({
      scene_number: scene.scene_number,
      asset_id: asset.id,
      path: asset.stored_path,
      planned_duration_sec: scene.duration_sec,
      actual_duration_sec: asset.duration_sec,
    });
  }
  if (clips.length === 0) {
    warnings.push('연결된 클립이 하나도 없어 렌더할 수 없습니다.');
  }

  const musicAsset = assets.find((a) => a.type === 'MUSIC');
  if (!musicAsset) warnings.push('연결된 배경음악 파일이 없습니다 — 원본 클립 오디오만 사용됩니다(무음일 수 있음).');

  let captionsPath = null;
  if (captionTrack?.srt) {
    const dir = tempDir(production.id);
    captionsPath = path.join(dir, 'captions.srt');
    fs.writeFileSync(captionsPath, captionTrack.srt, 'utf-8');
  } else {
    warnings.push('생성된 자막이 없습니다 — CAPTIONS 탭에서 먼저 생성하면 자막이 하드섭으로 삽입됩니다.');
  }

  let decisionReport = [];
  let textOverlays = [];
  if (editPlan?.decisions?.length > 0 && clips.length > 0) {
    const edits = computeClipEdits({ storyboard, clips, decisions: editPlan.decisions, hookText });
    decisionReport = edits.report;
    textOverlays = edits.textOverlays;
    for (const clip of clips) {
      const segments = edits.clipSegments.get(clip.scene_number);
      if (segments && segments.length > 0) clip.segments = segments;
    }
  } else if (editPlan?.decisions?.length > 0 && clips.length === 0) {
    warnings.push('Edit Plan이 있지만 연결된 클립이 없어 적용할 수 없습니다.');
  }

  if (textOverlays.length > 0 && !resolveKoreanCapableFont()) {
    warnings.push(
      'HOOK_TEXT_TIMING 텍스트 오버레이가 적용되지만, 이 환경에서 한글 지원 폰트를 찾지 못했습니다 — 한글이 빈 화면으로 렌더링될 수 있습니다.'
    );
  }

  const totalDuration = clips.reduce((sum, c) => sum + effectiveClipDuration(c), 0);

  return {
    production_id: production.id,
    preset,
    canvas: { width: canvas.width, height: canvas.height },
    fps: canvas.fps,
    crf: canvas.crf,
    encode_preset: canvas.encodePreset,
    duration_sec: totalDuration,
    clips,
    captions_path: captionsPath,
    music: musicAsset ? { asset_id: musicAsset.id, path: musicAsset.stored_path } : null,
    text_overlays: textOverlays,
    decision_report: decisionReport,
    warnings,
  };
}
