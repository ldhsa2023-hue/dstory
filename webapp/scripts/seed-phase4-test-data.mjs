// One-off seed script for Phase 4 (Channel DNA) manual testing. Creates 2
// more test productions (sharing genre with the Phase 3 test production to
// exercise Format Fatigue) with performance records, so the >=3 threshold
// for Channel DNA aggregation can be exercised without waiting on real
// YouTube data. Clearly a test fixture, not real data.
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'viral-studio.sqlite'));
function genId(prefix) {
  return `${prefix.slice(0, 3).toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
const now = () => new Date().toISOString();

function seedProduction({ title, hookType, genre, views, avgPct, subs }) {
  const trendId = genId('trend');
  db.prepare(
    `INSERT INTO trends (id, created_at, updated_at, name, platform, stage, momentum, evidence_confidence,
      higgsfield_fit, originality_potential, series_potential, risk, opportunity_score, channel_fit_score, status, raw_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(trendId, now(), now(), `[TEST] seed trend for ${title}`, 'TEST', 'SEED', 'n/a - synthetic', 'UNKNOWN', 3, 3, 3, 'none (test)', 50, 50, 'discovered', '{}');

  const conceptId = genId('concept');
  db.prepare(
    `INSERT INTO concepts (id, created_at, updated_at, trend_id, title, logline, why_now, genre, format, length_sec, clip_count, differentiation, status, raw_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(conceptId, now(), now(), trendId, title, `[TEST] ${title}`, 'Phase 4 검증용', genre, 'shorts', 24, 3, '[]', 'discovered', '{}');

  const hookId = genId('hook');
  db.prepare(`INSERT INTO hooks (id, created_at, concept_id, type, hook_text, narration, scores, selected) VALUES (?,?,?,?,?,?,?,?)`).run(
    hookId, now(), conceptId, hookType, '[TEST]', '[TEST]', '{}', 1
  );

  const productionId = genId('prod');
  const storyboard = [
    { scene_number: 1, duration_sec: 8, purpose: 'Hook' },
    { scene_number: 2, duration_sec: 8, purpose: '전개' },
    { scene_number: 3, duration_sec: 8, purpose: 'Payoff' },
  ];
  db.prepare(
    `INSERT INTO productions (id, created_at, updated_at, concept_id, hook_id, title, status, format, target_duration, storyboard)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(productionId, now(), now(), conceptId, hookId, title, 'PUBLISHED', 'shorts', 24, JSON.stringify(storyboard));

  const audioId = genId('audio');
  db.prepare(
    `INSERT INTO audio_plans (id, created_at, production_id, blueprint, music_prompt, music_timeline, sfx_cues) VALUES (?,?,?,?,?,?,?)`
  ).run(audioId, now(), productionId, JSON.stringify({ genre: 'orchestral', energy: views > 20000 ? 'HIGH' : 'MEDIUM' }), '[TEST]', '[]', '[]');

  const perfId = genId('perf');
  db.prepare(
    `INSERT INTO performance_records (id, created_at, updated_at, production_id, views, avg_percentage_viewed, subscribers_gained)
     VALUES (?,?,?,?,?,?,?)`
  ).run(perfId, now(), now(), productionId, views, avgPct, subs);

  return { trendId, conceptId, hookId, productionId };
}

const a = seedProduction({ title: '[TEST] 얼음 신전의 비밀', hookType: 'VISUAL_SHOCK', genre: 'cinematic_fantasy', views: 42000, avgPct: 71, subs: 120 });
const b = seedProduction({ title: '[TEST] 잊혀진 왕의 맹세', hookType: 'EMOTIONAL', genre: 'cinematic_fantasy', views: 8000, avgPct: 38, subs: 15 });

console.log(JSON.stringify({ a, b }, null, 2));
db.close();
