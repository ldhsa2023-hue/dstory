import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

export function readCollection(name) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, 'utf-8');
  if (!raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeCollection(name, items) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(name), JSON.stringify(items, null, 2), 'utf-8');
}

export function insertItem(name, item) {
  const items = readCollection(name);
  const withMeta = {
    id: item.id || genId(name),
    created_at: new Date().toISOString(),
    ...item,
  };
  items.unshift(withMeta);
  writeCollection(name, items);
  return withMeta;
}

export function updateItem(name, id, patch) {
  const items = readCollection(name);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, updated_at: new Date().toISOString() };
  writeCollection(name, items);
  return items[idx];
}

export function deleteItem(name, id) {
  const items = readCollection(name);
  const next = items.filter((i) => i.id !== id);
  writeCollection(name, next);
  return next.length !== items.length;
}

export function genId(prefix) {
  const short = prefix.slice(0, 3).toUpperCase();
  return `${short}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// settings.json is gitignored - stores local-only OpenAI API key
export function readSettings() {
  const p = filePath('settings');
  if (!fs.existsSync(p)) return { openaiApiKey: '' };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return { openaiApiKey: '' };
  }
}

export function writeSettings(settings) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath('settings'), JSON.stringify(settings, null, 2), 'utf-8');
}
