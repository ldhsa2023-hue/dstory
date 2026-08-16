import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'viral-studio.sqlite');

let db;

export function getDb() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_runs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      filters TEXT,
      engine TEXT,
      raw_prompt TEXT,
      raw_output TEXT,
      trend_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS trends (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      research_run_id TEXT,
      name TEXT NOT NULL,
      platform TEXT,
      stage TEXT,
      momentum TEXT,
      evidence_confidence TEXT,
      cross_platform_signal TEXT,
      competition TEXT,
      higgsfield_fit INTEGER,
      originality_potential INTEGER,
      series_potential INTEGER,
      risk TEXT,
      opportunity_score INTEGER,
      channel_fit_score INTEGER,
      status TEXT DEFAULT 'discovered',
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      trend_id TEXT,
      title TEXT,
      logline TEXT,
      why_now TEXT,
      genre TEXT,
      format TEXT,
      length_sec INTEGER,
      clip_count INTEGER,
      differentiation TEXT,
      status TEXT DEFAULT 'discovered',
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS hooks (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      concept_id TEXT NOT NULL,
      type TEXT,
      hook_text TEXT,
      narration TEXT,
      scores TEXT,
      selected INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS productions (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      concept_id TEXT,
      hook_id TEXT,
      title TEXT,
      status TEXT DEFAULT 'APPROVED',
      format TEXT,
      target_duration INTEGER,
      storyboard TEXT
    );

    CREATE TABLE IF NOT EXISTS prompt_packs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      global_visual_lock TEXT,
      image_prompts TEXT,
      higgsfield_prompts TEXT,
      higgsfield_mode TEXT
    );

    CREATE TABLE IF NOT EXISTS audio_plans (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      blueprint TEXT,
      music_prompt TEXT,
      music_timeline TEXT,
      sfx_cues TEXT
    );

    CREATE TABLE IF NOT EXISTS caption_tracks (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      captions TEXT,
      srt TEXT,
      vtt TEXT
    );

    CREATE TABLE IF NOT EXISTS effect_tracks (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      effects TEXT
    );

    CREATE TABLE IF NOT EXISTS publish_packs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      titles TEXT,
      description TEXT,
      hashtags TEXT,
      tags TEXT,
      thumbnail_concepts TEXT,
      pinned_comment TEXT,
      instagram_caption TEXT,
      instagram_hashtags TEXT,
      policy_review TEXT,
      qc_checklist TEXT,
      ready_to_publish INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      type TEXT NOT NULL,
      original_filename TEXT,
      stored_path TEXT NOT NULL,
      mime_type TEXT,
      duration_sec REAL,
      width INTEGER,
      height INTEGER,
      fps REAL,
      codec TEXT,
      linked_scene_number INTEGER,
      source_type TEXT,
      license_note TEXT,
      creator TEXT,
      source_url TEXT,
      commercial_use_confirmed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media_analyses (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      asset_id TEXT NOT NULL,
      scene_number INTEGER,
      technical TEXT,
      validation TEXT,
      signals TEXT,
      keyframes TEXT,
      contact_sheet_path TEXT,
      visual_review TEXT
    );

    CREATE TABLE IF NOT EXISTS edit_plans (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      intensity TEXT,
      hook_score TEXT,
      signal_map TEXT,
      decisions TEXT
    );

    CREATE TABLE IF NOT EXISTS render_jobs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      preset TEXT NOT NULL,
      status TEXT DEFAULT 'QUEUED',
      manifest TEXT,
      ffmpeg_args TEXT,
      output_path TEXT,
      report TEXT,
      error TEXT,
      started_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS performance_records (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      video_url TEXT,
      publish_date TEXT,
      views INTEGER,
      impressions INTEGER,
      viewed INTEGER,
      swiped_away INTEGER,
      avg_view_duration_sec REAL,
      avg_percentage_viewed REAL,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      subscribers_gained INTEGER,
      returning_viewers INTEGER
    );

    CREATE TABLE IF NOT EXISTS video_prompts (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      production_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      generation_mode TEXT,
      clips TEXT,
      version INTEGER DEFAULT 1
    );
  `);

  // Additive columns on pre-existing tables (node:sqlite has no
  // "ADD COLUMN IF NOT EXISTS", so we probe and ignore the duplicate-column
  // error on re-runs).
  for (const stmt of [
    "ALTER TABLE assets ADD COLUMN generation_outcome TEXT",
    "ALTER TABLE assets ADD COLUMN failure_reason TEXT",
    "ALTER TABLE assets ADD COLUMN is_ingredient INTEGER DEFAULT 0",
    "ALTER TABLE assets ADD COLUMN ingredient_name TEXT",
    "ALTER TABLE assets ADD COLUMN ingredient_type TEXT",
    "ALTER TABLE assets ADD COLUMN generation_provider TEXT",
    "ALTER TABLE productions ADD COLUMN video_provider TEXT DEFAULT 'higgsfield'",
    "ALTER TABLE video_prompts ADD COLUMN is_winner INTEGER DEFAULT 0",
  ]) {
    try {
      db.exec(stmt);
    } catch {
      // column already exists — fine
    }
  }
}
