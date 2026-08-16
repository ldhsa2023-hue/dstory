import fs from 'fs';
import path from 'path';
import { tempDir } from '../media/paths';

const PRESETS = {
  PREVIEW: { width: 540, height: 960, fps: 24, crf: 30, encodePreset: 'ultrafast' },
  FINAL: { width: 1080, height: 1920, fps: 30, crf: 20, encodePreset: 'medium' },
};

const PRESETS_16_9 = {
  PREVIEW: { width: 960, height: 540, fps: 24, crf: 30, encodePreset: 'ultrafast' },
  FINAL: { width: 1920, height: 1080, fps: 30, crf: 20, encodePreset: 'medium' },
};

// Builds a render manifest from what actually exists in the DB — never
// invents a clip, caption, or music track that wasn't generated/uploaded.
export function buildRenderManifest({ production, assets, captionTrack, preset }) {
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

  const totalDuration = clips.reduce((sum, c) => sum + (c.actual_duration_sec || c.planned_duration_sec || 0), 0);

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
    warnings,
  };
}
