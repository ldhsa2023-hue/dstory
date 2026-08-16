import path from 'path';
import { probeFile } from './ffprobe';
import { validateClip } from './technicalValidation';
import { detectVisualChangeSignals, detectAudioSignals } from './signalAnalysis';
import { extractKeyframes, buildContactSheet } from './keyframes';
import { keyframesDir } from './paths';
import { getVisualProvider } from '../ai/visualProvider';

// Full per-clip pipeline: INGEST -> FFPROBE -> TECHNICAL VALIDATION ->
// VIDEO/AUDIO SIGNAL ANALYSIS -> KEYFRAME EXTRACTION -> VISUAL REVIEW.
// Every field returned here traces back to an actual measurement or a real
// file read — see IMPLEMENTATION_PLAN.md's V3.2 section for what is (and
// isn't) covered.
export async function analyzeClip({ asset, productionId, plannedDurationSec, targetAspect, sceneNumber, hint }) {
  const technical = await probeFile(asset.stored_path);
  const validation = validateClip(technical, { plannedDurationSec, targetAspect });

  const [visualSignals, audioResult] = await Promise.all([
    detectVisualChangeSignals(asset.stored_path),
    detectAudioSignals(asset.stored_path),
  ]);
  technical.meanVolumeDb = audioResult.meanVolumeDb;
  technical.maxVolumeDb = audioResult.maxVolumeDb;

  const signals = [...visualSignals, ...audioResult.signals].sort((a, b) => a.timestamp_sec - b.timestamp_sec);

  const outDir = keyframesDir(productionId, asset.id);
  const sceneChangeTimestamps = visualSignals.map((s) => s.timestamp_sec);
  const keyframes = await extractKeyframes(asset.stored_path, technical.duration_sec, outDir, sceneChangeTimestamps).catch(
    () => []
  );

  const contactSheetPath =
    keyframes.length > 0 ? await buildContactSheet(keyframes, path.join(outDir, '..', `contact-sheet-${asset.id}.jpg`)) : null;

  const provider = await getVisualProvider();
  let visualReview = { description: null, provider: 'none' };
  if (contactSheetPath) {
    visualReview = await provider.describeImage(contactSheetPath, {
      contextHint: hint || `This is a contact sheet of ${keyframes.length} frames from a video clip, left to right in time order.`,
    });
  }

  return {
    production_id: productionId,
    asset_id: asset.id,
    scene_number: sceneNumber ?? null,
    technical,
    validation,
    signals,
    keyframes: keyframes.map((k) => ({ timestamp_sec: k.timestamp_sec, path: k.path, label: k.label })),
    contact_sheet_path: contactSheetPath,
    visual_review: visualReview,
  };
}
