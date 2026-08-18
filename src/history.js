import fs from 'node:fs';
import path from 'node:path';

const HISTORY_PATH = path.resolve(process.cwd(), 'data', 'history.json');

function load() {
  if (!fs.existsSync(HISTORY_PATH)) return { entries: [] };
  return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
}

export function hasCovered(title) {
  const { entries } = load();
  return entries.some((e) => e.title === title);
}

export function recordEntry(entry) {
  const history = load();
  history.entries.push({ ...entry, recordedAt: new Date().toISOString() });
  fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true });
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}
