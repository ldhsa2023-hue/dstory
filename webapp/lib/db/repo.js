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
    `UPDATE productions SET title = ?, status = ?, format = ?, target_duration = ?, storyboard = ?, hook_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    merged.title,
    merged.status,
    merged.format,
    merged.target_duration,
    JSON.stringify(merged.storyboard || []),
    merged.hook_id || null,
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
