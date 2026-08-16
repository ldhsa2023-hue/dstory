// One-off seed script for Phase 3 (render pipeline) manual testing.
// Talks to the SQLite file directly (avoiding relative-import extension
// issues under plain `node`) so we can seed a production without waiting on
// the Claude-driven Trend/Concept/Hook steps already verified in Phase 1/2.
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const db = new DatabaseSync(path.join(process.cwd(), 'data', 'viral-studio.sqlite'));

function genId(prefix) {
  return `${prefix.slice(0, 3).toUpperCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
const now = () => new Date().toISOString();

const trendId = genId('trend');
db.prepare(
  `INSERT INTO trends (id, created_at, updated_at, name, platform, stage, momentum, evidence_confidence,
    higgsfield_fit, originality_potential, series_potential, risk, opportunity_score, channel_fit_score, status, raw_json)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
).run(trendId, now(), now(), '[TEST] seed trend', 'TEST', 'SEED', 'n/a - synthetic', 'UNKNOWN', 3, 3, 3, 'none (test)', 50, 50, 'discovered', JSON.stringify({ rationale: 'synthetic test data' }));

const conceptId = genId('concept');
db.prepare(
  `INSERT INTO concepts (id, created_at, updated_at, trend_id, title, logline, why_now, genre, format, length_sec, clip_count, differentiation, status, raw_json)
   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
).run(conceptId, now(), now(), trendId, '렌더 테스트 컨셉', '3개 씬으로 구성된 렌더링 파이프라인 테스트용 컨셉', 'Phase 3 검증용', 'cinematic_fantasy', 'shorts', 24, 3, JSON.stringify(['World', 'Character', 'Visual', 'Ending']), 'discovered', JSON.stringify({ scores: {} }));

const hookId = genId('hook');
db.prepare(
  `INSERT INTO hooks (id, created_at, concept_id, type, hook_text, narration, scores, selected) VALUES (?,?,?,?,?,?,?,?)`
).run(hookId, now(), conceptId, 'CURIOSITY', '테스트 훅 텍스트', '테스트 내레이션', JSON.stringify({ stop_power: 3, curiosity: 3, clarity: 3, visual_strength: 3, emotional_strength: 3, retention_setup: 3, higgsfield_feasibility: 3 }), 1);

const productionId = genId('prod');
const storyboard = [
  { scene_number: 1, duration_sec: 8, purpose: 'Hook - opening reveal' },
  { scene_number: 2, duration_sec: 8, purpose: '전개 - rising tension' },
  { scene_number: 3, duration_sec: 8, purpose: 'Payoff - cliffhanger ending' },
];
db.prepare(
  `INSERT INTO productions (id, created_at, updated_at, concept_id, hook_id, title, status, format, target_duration, storyboard)
   VALUES (?,?,?,?,?,?,?,?,?,?)`
).run(productionId, now(), now(), conceptId, hookId, '렌더 테스트 컨셉', 'PROMPTS READY', 'shorts', 24, JSON.stringify(storyboard));

const packId = genId('pack');
db.prepare(
  `INSERT INTO prompt_packs (id, created_at, production_id, global_visual_lock, image_prompts, higgsfield_prompts, higgsfield_mode)
   VALUES (?,?,?,?,?,?,?)`
).run(packId, now(), productionId, '[TEST] synthetic style lock', JSON.stringify([1, 2, 3].map((n) => ({ scene_number: n, prompt: `[TEST] image prompt scene ${n}` }))), JSON.stringify([1, 2, 3].map((n) => ({ scene_number: n, duration_sec: 8, prompt: `[TEST] higgsfield prompt scene ${n}` }))), 'CINEMATIC');

function toSrtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60), ms = Math.round((sec - Math.floor(sec)) * 1000);
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
const captions = [
  { start_sec: 0, end_sec: 2, text: '테스트 훅 텍스트', type: 'HOOK_TEXT', emphasis: 'STRONG', position: 'CENTER', animation: 'POP' },
  { start_sec: 8, end_sec: 10.5, text: '전개 자막', type: 'NARRATION', emphasis: 'NONE', position: 'BOTTOM_SAFE', animation: 'FADE' },
  { start_sec: 16, end_sec: 19, text: '반전의 순간', type: 'REACTION', emphasis: 'WORD', position: 'CENTER', animation: 'BOUNCE' },
];
const srt = captions.map((c, i) => `${i + 1}\n${toSrtTime(c.start_sec)} --> ${toSrtTime(c.end_sec)}\n${c.text}\n`).join('\n');
const vtt = `WEBVTT\n\n` + captions.map((c) => `${toSrtTime(c.start_sec).replace(',', '.')} --> ${toSrtTime(c.end_sec).replace(',', '.')}\n${c.text}\n`).join('\n');

const capId = genId('cap');
db.prepare(`INSERT INTO caption_tracks (id, created_at, production_id, captions, srt, vtt) VALUES (?,?,?,?,?,?)`).run(capId, now(), productionId, JSON.stringify(captions), srt, vtt);

console.log(JSON.stringify({ trendId, conceptId, hookId, productionId }, null, 2));
db.close();
