import { getDb } from './sqlite';

export function genId(prefix) {
  const short = prefix.slice(0, 3).toUpperCase();
  return `${short}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function now() {
  return new Date().toISOString();
}

// ---------- Channel Profile (single row) ----------
export function getChannelProfile() {
  const db = getDb();
  const row = db.prepare('SELECT * FROM channel_profile WHERE id = 1').get();
  if (!row) return null;
  return { ...JSON.parse(row.data), created_at: row.created_at, updated_at: row.updated_at };
}

export function saveChannelProfile(data) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM channel_profile WHERE id = 1').get();
  const ts = now();
  if (existing) {
    db.prepare('UPDATE channel_profile SET data = ?, updated_at = ? WHERE id = 1').run(JSON.stringify(data), ts);
  } else {
    db.prepare('INSERT INTO channel_profile (id, data, created_at, updated_at) VALUES (1, ?, ?, ?)').run(
      JSON.stringify(data),
      ts,
      ts
    );
  }
  return getChannelProfile();
}

// ---------- Research Runs ----------
export function insertResearchRun(item) {
  const db = getDb();
  const id = genId('run');
  db.prepare(
    `INSERT INTO research_runs (id, created_at, filters, engine, raw_prompt, raw_output, trend_count, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    now(),
    JSON.stringify(item.filters || {}),
    item.engine || 'manual',
    item.raw_prompt || '',
    item.raw_output || '',
    item.trend_count || 0,
    item.status || 'completed'
  );
  return { id, ...item };
}

export function listResearchRuns() {
  const db = getDb();
  return db.prepare('SELECT * FROM research_runs ORDER BY created_at DESC').all();
}

// ---------- Trends ----------
export function insertTrend(item) {
  const db = getDb();
  const id = item.id || genId('trend');
  const ts = now();
  db.prepare(
    `INSERT INTO trends (id, created_at, updated_at, research_run_id, name, platform, stage, momentum,
      evidence_confidence, cross_platform_signal, competition, higgsfield_fit, originality_potential,
      series_potential, risk, opportunity_score, channel_fit_score, status, raw_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    ts,
    ts,
    item.research_run_id || null,
    item.name,
    item.platform || '',
    item.stage || 'SEED',
    item.momentum || '',
    item.evidence_confidence || 'UNKNOWN',
    item.cross_platform_signal || '',
    item.competition || '',
    item.higgsfield_fit ?? 3,
    item.originality_potential ?? 3,
    item.series_potential ?? 3,
    item.risk || '',
    item.opportunity_score ?? 0,
    item.channel_fit_score ?? 0,
    item.status || 'discovered',
    JSON.stringify(item.raw_json || {})
  );
  return getTrend(id);
}

export function listTrends() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM trends ORDER BY created_at DESC').all();
  return rows.map(parseTrendRow);
}

export function getTrend(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM trends WHERE id = ?').get(id);
  return row ? parseTrendRow(row) : null;
}

export function updateTrendStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE trends SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
  return getTrend(id);
}

export function deleteTrend(id) {
  const db = getDb();
  db.prepare('DELETE FROM trends WHERE id = ?').run(id);
}

function parseTrendRow(row) {
  return { ...row, raw_json: safeParse(row.raw_json) };
}

// ---------- Concepts ----------
export function insertConcept(item) {
  const db = getDb();
  const id = item.id || genId('concept');
  const ts = now();
  db.prepare(
    `INSERT INTO concepts (id, created_at, updated_at, trend_id, title, logline, why_now, genre, format,
      length_sec, clip_count, differentiation, status, raw_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    ts,
    ts,
    item.trend_id || null,
    item.title || '',
    item.logline || '',
    item.why_now || '',
    item.genre || '',
    item.format || 'shorts',
    item.length_sec || 20,
    item.clip_count || 3,
    JSON.stringify(item.differentiation || []),
    item.status || 'discovered',
    JSON.stringify(item.raw_json || {})
  );
  return getConcept(id);
}

export function listConcepts(filter = {}) {
  const db = getDb();
  let rows;
  if (filter.trend_id) {
    rows = db.prepare('SELECT * FROM concepts WHERE trend_id = ? ORDER BY created_at DESC').all(filter.trend_id);
  } else {
    rows = db.prepare('SELECT * FROM concepts ORDER BY created_at DESC').all();
  }
  return rows.map(parseConceptRow);
}

export function getConcept(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM concepts WHERE id = ?').get(id);
  return row ? parseConceptRow(row) : null;
}

export function updateConceptStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE concepts SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
  return getConcept(id);
}

function parseConceptRow(row) {
  return { ...row, differentiation: safeParse(row.differentiation, []), raw_json: safeParse(row.raw_json) };
}

// ---------- Hooks ----------
export function insertHook(item) {
  const db = getDb();
  const id = item.id || genId('hook');
  db.prepare(
    `INSERT INTO hooks (id, created_at, concept_id, type, hook_text, narration, scores, selected)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    item.concept_id,
    item.type || '',
    item.hook_text || '',
    item.narration || '',
    JSON.stringify(item.scores || {}),
    item.selected ? 1 : 0
  );
  return getHook(id);
}

export function listHooksByConcept(conceptId) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM hooks WHERE concept_id = ? ORDER BY created_at ASC').all(conceptId);
  return rows.map(parseHookRow);
}

export function getHook(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM hooks WHERE id = ?').get(id);
  return row ? parseHookRow(row) : null;
}

export function selectHook(conceptId, hookId) {
  const db = getDb();
  db.prepare('UPDATE hooks SET selected = 0 WHERE concept_id = ?').run(conceptId);
  db.prepare('UPDATE hooks SET selected = 1 WHERE id = ?').run(hookId);
  return getHook(hookId);
}

function parseHookRow(row) {
  return { ...row, scores: safeParse(row.scores, {}), selected: Boolean(row.selected) };
}

// ---------- Productions ----------
export function insertProduction(item) {
  const db = getDb();
  const id = item.id || genId('prod');
  const ts = now();
  db.prepare(
    `INSERT INTO productions (id, created_at, updated_at, concept_id, hook_id, title, status, format,
      target_duration, storyboard)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    ts,
    ts,
    item.concept_id || null,
    item.hook_id || null,
    item.title || '',
    item.status || 'APPROVED',
    item.format || 'shorts',
    item.target_duration || 20,
    JSON.stringify(item.storyboard || [])
  );
  return getProduction(id);
}

export function listProductions() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM productions ORDER BY created_at DESC').all();
  return rows.map(parseProductionRow);
}

export function getProduction(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM productions WHERE id = ?').get(id);
  return row ? parseProductionRow(row) : null;
}

export function updateProduction(id, patch) {
  const db = getDb();
  const current = getProduction(id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  db.prepare(
    `UPDATE productions SET title = ?, status = ?, format = ?, target_duration = ?, storyboard = ?, hook_id = ?, video_provider = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    merged.title,
    merged.status,
    merged.format,
    merged.target_duration,
    JSON.stringify(merged.storyboard || []),
    merged.hook_id || null,
    merged.video_provider || 'higgsfield',
    now(),
    id
  );
  return getProduction(id);
}

function parseProductionRow(row) {
  return { ...row, storyboard: safeParse(row.storyboard, []) };
}

// ---------- Prompt Packs ----------
export function upsertPromptPack(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM prompt_packs WHERE production_id = ?').get(productionId);
  if (existing) {
    const merged = { ...parsePromptPackRow(existing), ...patch };
    db.prepare(
      `UPDATE prompt_packs SET global_visual_lock = ?, image_prompts = ?, higgsfield_prompts = ?, higgsfield_mode = ?
       WHERE production_id = ?`
    ).run(
      merged.global_visual_lock || '',
      JSON.stringify(merged.image_prompts || []),
      JSON.stringify(merged.higgsfield_prompts || []),
      merged.higgsfield_mode || 'CINEMATIC',
      productionId
    );
    return getPromptPack(productionId);
  }
  const id = genId('pack');
  db.prepare(
    `INSERT INTO prompt_packs (id, created_at, production_id, global_visual_lock, image_prompts, higgsfield_prompts, higgsfield_mode)
     VALUES (?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    productionId,
    patch.global_visual_lock || '',
    JSON.stringify(patch.image_prompts || []),
    JSON.stringify(patch.higgsfield_prompts || []),
    patch.higgsfield_mode || 'CINEMATIC'
  );
  return getPromptPack(productionId);
}

export function getPromptPack(productionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM prompt_packs WHERE production_id = ?').get(productionId);
  return row ? parsePromptPackRow(row) : null;
}

function parsePromptPackRow(row) {
  return {
    ...row,
    image_prompts: safeParse(row.image_prompts, []),
    higgsfield_prompts: safeParse(row.higgsfield_prompts, []),
  };
}

// ---------- Audio Plans ----------
export function upsertAudioPlan(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM audio_plans WHERE production_id = ?').get(productionId);
  if (existing) {
    const merged = { ...parseAudioPlanRow(existing), ...patch };
    db.prepare('UPDATE audio_plans SET blueprint = ?, music_prompt = ?, music_timeline = ?, sfx_cues = ? WHERE production_id = ?').run(
      JSON.stringify(merged.blueprint || {}),
      merged.music_prompt || '',
      JSON.stringify(merged.music_timeline || []),
      JSON.stringify(merged.sfx_cues || []),
      productionId
    );
    return getAudioPlan(productionId);
  }
  const id = genId('audio');
  db.prepare(
    'INSERT INTO audio_plans (id, created_at, production_id, blueprint, music_prompt, music_timeline, sfx_cues) VALUES (?,?,?,?,?,?,?)'
  ).run(
    id,
    now(),
    productionId,
    JSON.stringify(patch.blueprint || {}),
    patch.music_prompt || '',
    JSON.stringify(patch.music_timeline || []),
    JSON.stringify(patch.sfx_cues || [])
  );
  return getAudioPlan(productionId);
}

export function getAudioPlan(productionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM audio_plans WHERE production_id = ?').get(productionId);
  return row ? parseAudioPlanRow(row) : null;
}

function parseAudioPlanRow(row) {
  return {
    ...row,
    blueprint: safeParse(row.blueprint, {}),
    music_timeline: safeParse(row.music_timeline, []),
    sfx_cues: safeParse(row.sfx_cues, []),
  };
}

// ---------- Caption Tracks ----------
export function upsertCaptionTrack(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM caption_tracks WHERE production_id = ?').get(productionId);
  if (existing) {
    const merged = { ...parseCaptionTrackRow(existing), ...patch };
    db.prepare('UPDATE caption_tracks SET captions = ?, srt = ?, vtt = ? WHERE production_id = ?').run(
      JSON.stringify(merged.captions || []),
      merged.srt || '',
      merged.vtt || '',
      productionId
    );
    return getCaptionTrack(productionId);
  }
  const id = genId('cap');
  db.prepare('INSERT INTO caption_tracks (id, created_at, production_id, captions, srt, vtt) VALUES (?,?,?,?,?,?)').run(
    id,
    now(),
    productionId,
    JSON.stringify(patch.captions || []),
    patch.srt || '',
    patch.vtt || ''
  );
  return getCaptionTrack(productionId);
}

export function getCaptionTrack(productionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM caption_tracks WHERE production_id = ?').get(productionId);
  return row ? parseCaptionTrackRow(row) : null;
}

function parseCaptionTrackRow(row) {
  return { ...row, captions: safeParse(row.captions, []) };
}

// ---------- Effect Tracks ----------
export function upsertEffectTrack(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM effect_tracks WHERE production_id = ?').get(productionId);
  if (existing) {
    const merged = { ...parseEffectTrackRow(existing), ...patch };
    db.prepare('UPDATE effect_tracks SET effects = ? WHERE production_id = ?').run(
      JSON.stringify(merged.effects || []),
      productionId
    );
    return getEffectTrack(productionId);
  }
  const id = genId('fx');
  db.prepare('INSERT INTO effect_tracks (id, created_at, production_id, effects) VALUES (?,?,?,?)').run(
    id,
    now(),
    productionId,
    JSON.stringify(patch.effects || [])
  );
  return getEffectTrack(productionId);
}

export function getEffectTrack(productionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM effect_tracks WHERE production_id = ?').get(productionId);
  return row ? parseEffectTrackRow(row) : null;
}

function parseEffectTrackRow(row) {
  return { ...row, effects: safeParse(row.effects, []) };
}

// ---------- Publish Packs ----------
export function upsertPublishPack(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM publish_packs WHERE production_id = ?').get(productionId);
  if (existing) {
    const merged = { ...parsePublishPackRow(existing), ...patch };
    db.prepare(
      `UPDATE publish_packs SET titles = ?, description = ?, hashtags = ?, tags = ?, thumbnail_concepts = ?,
        pinned_comment = ?, instagram_caption = ?, instagram_hashtags = ?, policy_review = ?, qc_checklist = ?,
        ready_to_publish = ?
       WHERE production_id = ?`
    ).run(
      JSON.stringify(merged.titles || []),
      merged.description || '',
      JSON.stringify(merged.hashtags || []),
      JSON.stringify(merged.tags || []),
      JSON.stringify(merged.thumbnail_concepts || []),
      merged.pinned_comment || '',
      merged.instagram_caption || '',
      JSON.stringify(merged.instagram_hashtags || []),
      JSON.stringify(merged.policy_review || {}),
      JSON.stringify(merged.qc_checklist || {}),
      merged.ready_to_publish ? 1 : 0,
      productionId
    );
    return getPublishPack(productionId);
  }
  const id = genId('pub');
  db.prepare(
    `INSERT INTO publish_packs (id, created_at, production_id, titles, description, hashtags, tags,
      thumbnail_concepts, pinned_comment, instagram_caption, instagram_hashtags, policy_review, qc_checklist, ready_to_publish)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    productionId,
    JSON.stringify(patch.titles || []),
    patch.description || '',
    JSON.stringify(patch.hashtags || []),
    JSON.stringify(patch.tags || []),
    JSON.stringify(patch.thumbnail_concepts || []),
    patch.pinned_comment || '',
    patch.instagram_caption || '',
    JSON.stringify(patch.instagram_hashtags || []),
    JSON.stringify(patch.policy_review || {}),
    JSON.stringify(patch.qc_checklist || {}),
    patch.ready_to_publish ? 1 : 0
  );
  return getPublishPack(productionId);
}

export function getPublishPack(productionId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM publish_packs WHERE production_id = ?').get(productionId);
  return row ? parsePublishPackRow(row) : null;
}

function parsePublishPackRow(row) {
  return {
    ...row,
    titles: safeParse(row.titles, []),
    hashtags: safeParse(row.hashtags, []),
    tags: safeParse(row.tags, []),
    thumbnail_concepts: safeParse(row.thumbnail_concepts, []),
    instagram_hashtags: safeParse(row.instagram_hashtags, []),
    policy_review: safeParse(row.policy_review, {}),
    qc_checklist: safeParse(row.qc_checklist, {}),
    ready_to_publish: Boolean(row.ready_to_publish),
  };
}

function safeParse(str, fallback = null) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ---------- Assets ----------
export function insertAsset(item) {
  const db = getDb();
  const id = item.id || genId('asset');
  db.prepare(
    `INSERT INTO assets (id, created_at, production_id, type, original_filename, stored_path, mime_type,
      duration_sec, width, height, fps, codec, linked_scene_number, source_type, license_note, creator,
      source_url, commercial_use_confirmed)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    item.production_id,
    item.type,
    item.original_filename || '',
    item.stored_path,
    item.mime_type || '',
    item.duration_sec ?? null,
    item.width ?? null,
    item.height ?? null,
    item.fps ?? null,
    item.codec || '',
    item.linked_scene_number ?? null,
    item.source_type || 'unknown',
    item.license_note || '',
    item.creator || '',
    item.source_url || '',
    item.commercial_use_confirmed ? 1 : 0
  );
  return getAsset(id);
}

export function listAssetsByProduction(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM assets WHERE production_id = ? ORDER BY created_at ASC')
    .all(productionId)
    .map(parseAssetRow);
}

export function getAsset(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  return row ? parseAssetRow(row) : null;
}

export function linkAssetToScene(id, sceneNumber) {
  const db = getDb();
  db.prepare('UPDATE assets SET linked_scene_number = ? WHERE id = ?').run(sceneNumber, id);
  return getAsset(id);
}

export function deleteAsset(id) {
  const db = getDb();
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
}

function parseAssetRow(row) {
  return {
    ...row,
    commercial_use_confirmed: Boolean(row.commercial_use_confirmed),
    is_ingredient: Boolean(row.is_ingredient),
  };
}

// ---------- Render Jobs ----------
export function insertRenderJob(item) {
  const db = getDb();
  const id = item.id || genId('render');
  db.prepare(
    `INSERT INTO render_jobs (id, created_at, production_id, preset, status, manifest, ffmpeg_args, output_path,
      report, error, started_at, completed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    item.production_id,
    item.preset,
    item.status || 'QUEUED',
    JSON.stringify(item.manifest || {}),
    JSON.stringify(item.ffmpeg_args || []),
    item.output_path || null,
    JSON.stringify(item.report || {}),
    item.error || null,
    item.started_at || null,
    item.completed_at || null
  );
  return getRenderJob(id);
}

export function updateRenderJob(id, patch) {
  const db = getDb();
  const current = getRenderJob(id);
  if (!current) return null;
  const merged = { ...current, ...patch };
  db.prepare(
    `UPDATE render_jobs SET status = ?, manifest = ?, ffmpeg_args = ?, output_path = ?, report = ?, error = ?,
      started_at = ?, completed_at = ? WHERE id = ?`
  ).run(
    merged.status,
    JSON.stringify(merged.manifest || {}),
    JSON.stringify(merged.ffmpeg_args || []),
    merged.output_path || null,
    JSON.stringify(merged.report || {}),
    merged.error || null,
    merged.started_at || null,
    merged.completed_at || null,
    id
  );
  return getRenderJob(id);
}

export function getRenderJob(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM render_jobs WHERE id = ?').get(id);
  return row ? parseRenderJobRow(row) : null;
}

export function listRenderJobsByProduction(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM render_jobs WHERE production_id = ? ORDER BY created_at DESC')
    .all(productionId)
    .map(parseRenderJobRow);
}

function parseRenderJobRow(row) {
  return {
    ...row,
    manifest: safeParse(row.manifest, {}),
    ffmpeg_args: safeParse(row.ffmpeg_args, []),
    report: safeParse(row.report, {}),
  };
}

// ---------- Media Analyses (one row per analyzed clip asset) ----------
export function upsertMediaAnalysis(assetId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM media_analyses WHERE asset_id = ?').get(assetId);
  if (existing) {
    const merged = { ...parseMediaAnalysisRow(existing), ...patch };
    db.prepare(
      `UPDATE media_analyses SET scene_number = ?, technical = ?, validation = ?, signals = ?, keyframes = ?,
        contact_sheet_path = ?, visual_review = ? WHERE asset_id = ?`
    ).run(
      merged.scene_number ?? null,
      JSON.stringify(merged.technical || {}),
      JSON.stringify(merged.validation || {}),
      JSON.stringify(merged.signals || []),
      JSON.stringify(merged.keyframes || []),
      merged.contact_sheet_path || null,
      JSON.stringify(merged.visual_review || {}),
      assetId
    );
    return getMediaAnalysisByAsset(assetId);
  }
  const id = genId('media');
  db.prepare(
    `INSERT INTO media_analyses (id, created_at, production_id, asset_id, scene_number, technical, validation,
      signals, keyframes, contact_sheet_path, visual_review)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    patch.production_id,
    assetId,
    patch.scene_number ?? null,
    JSON.stringify(patch.technical || {}),
    JSON.stringify(patch.validation || {}),
    JSON.stringify(patch.signals || []),
    JSON.stringify(patch.keyframes || []),
    patch.contact_sheet_path || null,
    JSON.stringify(patch.visual_review || {})
  );
  return getMediaAnalysisByAsset(assetId);
}

export function getMediaAnalysisByAsset(assetId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM media_analyses WHERE asset_id = ?').get(assetId);
  return row ? parseMediaAnalysisRow(row) : null;
}

export function listMediaAnalysesByProduction(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM media_analyses WHERE production_id = ? ORDER BY scene_number ASC')
    .all(productionId)
    .map(parseMediaAnalysisRow);
}

function parseMediaAnalysisRow(row) {
  return {
    ...row,
    technical: safeParse(row.technical, {}),
    validation: safeParse(row.validation, {}),
    signals: safeParse(row.signals, []),
    keyframes: safeParse(row.keyframes, []),
    visual_review: safeParse(row.visual_review, {}),
  };
}

// ---------- Edit Plans ----------
export function insertEditPlan(item) {
  const db = getDb();
  const id = genId('edit');
  db.prepare(
    `INSERT INTO edit_plans (id, created_at, production_id, intensity, hook_score, signal_map, decisions)
     VALUES (?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    item.production_id,
    item.intensity || 'BALANCED',
    JSON.stringify(item.hook_score || {}),
    JSON.stringify(item.signal_map || []),
    JSON.stringify(item.decisions || [])
  );
  return getEditPlan(id);
}

export function getEditPlan(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM edit_plans WHERE id = ?').get(id);
  return row ? parseEditPlanRow(row) : null;
}

export function listEditPlansByProduction(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM edit_plans WHERE production_id = ? ORDER BY created_at DESC')
    .all(productionId)
    .map(parseEditPlanRow);
}

function parseEditPlanRow(row) {
  return {
    ...row,
    hook_score: safeParse(row.hook_score, {}),
    signal_map: safeParse(row.signal_map, []),
    decisions: safeParse(row.decisions, []),
  };
}

// ---------- Performance Records (one per published production) ----------
const PERF_FIELDS = [
  'video_url', 'publish_date', 'views', 'impressions', 'viewed', 'swiped_away',
  'avg_view_duration_sec', 'avg_percentage_viewed', 'likes', 'comments', 'shares',
  'subscribers_gained', 'returning_viewers',
];

export function upsertPerformanceRecord(productionId, patch) {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM performance_records WHERE production_id = ?').get(productionId);
  const ts = now();
  if (existing) {
    const merged = { ...existing, ...patch };
    db.prepare(
      `UPDATE performance_records SET ${PERF_FIELDS.map((f) => `${f} = ?`).join(', ')}, updated_at = ? WHERE production_id = ?`
    ).run(...PERF_FIELDS.map((f) => merged[f] ?? null), ts, productionId);
  } else {
    const id = genId('perf');
    db.prepare(
      `INSERT INTO performance_records (id, created_at, updated_at, production_id, ${PERF_FIELDS.join(', ')})
       VALUES (?,?,?,?,${PERF_FIELDS.map(() => '?').join(',')})`
    ).run(id, ts, ts, productionId, ...PERF_FIELDS.map((f) => patch[f] ?? null));
  }
  return getPerformanceRecord(productionId);
}

export function getPerformanceRecord(productionId) {
  const db = getDb();
  return db.prepare('SELECT * FROM performance_records WHERE production_id = ?').get(productionId) || null;
}

export function listAllPerformanceWithProduction() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pr.*, p.title as production_title, p.concept_id, p.hook_id, p.format, p.target_duration, p.storyboard
       FROM performance_records pr JOIN productions p ON p.id = pr.production_id
       ORDER BY pr.created_at DESC`
    )
    .all();
  return rows.map((r) => ({ ...r, storyboard: safeParse(r.storyboard, []) }));
}

// ---------- Generation Outcome (on VIDEO_CLIP assets) ----------
export function setAssetGenerationOutcome(assetId, outcome, failureReason, generationProvider) {
  const db = getDb();
  const current = getAsset(assetId);
  db.prepare('UPDATE assets SET generation_outcome = ?, failure_reason = ?, generation_provider = ? WHERE id = ?').run(
    outcome || null,
    failureReason || null,
    generationProvider !== undefined ? generationProvider || null : current?.generation_provider || null,
    assetId
  );
  return getAsset(assetId);
}

export function listSuccessfulClipAssets() {
  const db = getDb();
  return db.prepare("SELECT * FROM assets WHERE type = 'VIDEO_CLIP' AND generation_outcome = 'SUCCESS'").all().map(parseAssetRow);
}

export function listOutcomeClipAssetsWithProvider() {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM assets WHERE type = 'VIDEO_CLIP' AND generation_outcome IS NOT NULL AND generation_provider IS NOT NULL"
    )
    .all()
    .map(parseAssetRow);
}

// ---------- Recent productions (for Format Fatigue) ----------
export function listRecentProductionsWithDetail(limit = 5) {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM productions ORDER BY created_at DESC LIMIT ?').all(limit);
  return rows.map(parseProductionRow);
}

// ---------- Video Prompts (per-provider prompt compilations) ----------
// Not merged with prompt_packs (Higgsfield's table) — each provider's
// output is stored separately so switching providers never overwrites
// another provider's result.
export function insertVideoPrompts(productionId, provider, generationMode, globalVisualLock, clips) {
  const db = getDb();
  const id = genId('vprompt');
  const clipsWithProgress = (clips || []).map((c) => ({
    ...c,
    progress: { start_frame_done: false, end_frame_done: false, video_done: false },
  }));
  const payload = { global_visual_lock: globalVisualLock || '', clips: clipsWithProgress };
  const row = db
    .prepare('SELECT MAX(version) as maxVersion FROM video_prompts WHERE production_id = ? AND provider = ?')
    .get(productionId, provider);
  const version = (row?.maxVersion || 0) + 1;
  db.prepare(
    'INSERT INTO video_prompts (id, created_at, production_id, provider, generation_mode, clips, version) VALUES (?,?,?,?,?,?,?)'
  ).run(id, now(), productionId, provider, generationMode, JSON.stringify(payload), version);
  return getVideoPromptsById(id);
}

export function updateVideoPromptClipProgress(id, sceneNumber, field, value) {
  const db = getDb();
  const record = getVideoPromptsById(id);
  if (!record) return null;
  const clips = record.clips.map((c) =>
    c.scene_number === sceneNumber ? { ...c, progress: { ...c.progress, [field]: !!value } } : c
  );
  const payload = { global_visual_lock: record.global_visual_lock, clips };
  db.prepare('UPDATE video_prompts SET clips = ? WHERE id = ?').run(JSON.stringify(payload), id);
  return getVideoPromptsById(id);
}

export function setVideoPromptWinner(id, isWinner) {
  const db = getDb();
  db.prepare('UPDATE video_prompts SET is_winner = ? WHERE id = ?').run(isWinner ? 1 : 0, id);
  return getVideoPromptsById(id);
}

export function getVideoPromptsById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM video_prompts WHERE id = ?').get(id);
  return row ? parseVideoPromptsRow(row) : null;
}

export function getLatestVideoPrompts(productionId, provider) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM video_prompts WHERE production_id = ? AND provider = ? ORDER BY created_at DESC LIMIT 1')
    .get(productionId, provider);
  return row ? parseVideoPromptsRow(row) : null;
}

export function listVideoPromptsByProduction(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM video_prompts WHERE production_id = ? ORDER BY created_at DESC')
    .all(productionId)
    .map(parseVideoPromptsRow);
}

function parseVideoPromptsRow(row) {
  const payload = safeParse(row.clips, { global_visual_lock: '', clips: [] });
  return {
    ...row,
    global_visual_lock: payload.global_visual_lock || '',
    clips: payload.clips || [],
    is_winner: Boolean(row.is_winner),
  };
}

// ---------- Asset Ingredient metadata ----------
export function setAssetIngredient(assetId, { isIngredient, ingredientName, ingredientType }) {
  const db = getDb();
  db.prepare('UPDATE assets SET is_ingredient = ?, ingredient_name = ?, ingredient_type = ? WHERE id = ?').run(
    isIngredient ? 1 : 0,
    ingredientName || null,
    ingredientType || null,
    assetId
  );
  return getAsset(assetId);
}

export function listIngredientAssets(productionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM assets WHERE production_id = ? AND is_ingredient = 1')
    .all(productionId)
    .map(parseAssetRow);
}

// ---------- Beat Analysis ----------
export function insertBeatAnalysis(productionId, assetId, result) {
  const db = getDb();
  const id = genId('beat');
  db.prepare(
    `INSERT INTO beat_analyses (id, created_at, production_id, asset_id, bpm, confidence, onset_times, onset_count, method, duration_sec)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    now(),
    productionId,
    assetId,
    result.bpm,
    result.confidence,
    JSON.stringify(result.onsetTimes || []),
    result.onsetCount,
    result.method,
    result.durationSec
  );
  return getBeatAnalysis(id);
}

export function getBeatAnalysis(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM beat_analyses WHERE id = ?').get(id);
  return row ? parseBeatAnalysisRow(row) : null;
}

export function getLatestBeatAnalysis(productionId) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM beat_analyses WHERE production_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(productionId);
  return row ? parseBeatAnalysisRow(row) : null;
}

function parseBeatAnalysisRow(row) {
  return { ...row, onset_times: safeParse(row.onset_times, []) };
}
