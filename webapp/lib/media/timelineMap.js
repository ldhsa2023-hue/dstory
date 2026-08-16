// Single source of truth for "where does each scene sit on the global
// timeline" — cumulative offsets derived only from real, already-stored
// scene durations, never guessed timing. Reused by buildGlobalSignalMap
// (below) and by the render pipeline (lib/render/editApply.js) so both
// only ever compute this once, the same way.
export function computeSceneOffsets(storyboard, mediaAnalysesByScene) {
  const offsets = [];
  let offset = 0;
  for (const scene of storyboard || []) {
    const analysis = mediaAnalysesByScene?.get(scene.scene_number);
    const start = offset;
    offset += scene.duration_sec || analysis?.technical?.duration_sec || 0;
    offsets.push({ scene_number: scene.scene_number, start: Number(start.toFixed(2)), end: Number(offset.toFixed(2)) });
  }
  return offsets;
}

// Merges each clip's per-clip signals (local timestamps) into one
// production-wide timeline using the storyboard's actual scene order and
// durations — the only "invented" numbers here are cumulative offsets
// derived from real, already-stored scene durations, never guessed timing.
export function buildGlobalSignalMap(storyboard, mediaAnalyses) {
  const byScene = new Map(mediaAnalyses.map((a) => [a.scene_number, a]));
  const sceneOffsets = computeSceneOffsets(storyboard, byScene);
  const offsetByScene = new Map(sceneOffsets.map((o) => [o.scene_number, o]));
  const map = [];

  for (const scene of storyboard || []) {
    const analysis = byScene.get(scene.scene_number);
    const { start, end } = offsetByScene.get(scene.scene_number);

    map.push({
      id: `boundary-${scene.scene_number}-start`,
      timestamp_sec: start,
      type: 'CLIP_BOUNDARY_START',
      strength: 'HIGH',
      source: `storyboard scene ${scene.scene_number}`,
      confidence: 'MEASURED',
      scene_number: scene.scene_number,
    });

    if (analysis) {
      for (const s of analysis.signals || []) {
        map.push({
          id: `sig-${scene.scene_number}-${s.timestamp_sec}-${s.type}`,
          timestamp_sec: Number((start + s.timestamp_sec).toFixed(2)),
          type: s.type,
          strength: s.strength,
          source: s.source,
          confidence: s.confidence,
          scene_number: scene.scene_number,
        });
      }
    }

    map.push({
      id: `boundary-${scene.scene_number}-end`,
      timestamp_sec: end,
      type: 'CLIP_BOUNDARY_END',
      strength: 'HIGH',
      source: `storyboard scene ${scene.scene_number}`,
      confidence: 'MEASURED',
      scene_number: scene.scene_number,
    });
  }

  return map.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
}
