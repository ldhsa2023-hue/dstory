import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');

// Our own genId() output is always `${3upper}-${base36}-${base36}`. Reject
// anything else before it ever touches a filesystem path — this is the main
// defense against path traversal via a spoofed productionId/assetId.
const SAFE_ID = /^[A-Z]{3}-[a-z0-9]+-[a-z0-9]+$/;

export function assertSafeId(id, label = 'id') {
  if (typeof id !== 'string' || !SAFE_ID.test(id)) {
    throw new Error(`잘못된 ${label} 형식입니다.`);
  }
  return id;
}

export function assetDir(productionId) {
  assertSafeId(productionId, 'productionId');
  const dir = path.join(DATA_DIR, 'assets', 'original', productionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function exportDir(productionId) {
  assertSafeId(productionId, 'productionId');
  const dir = path.join(DATA_DIR, 'exports', productionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function tempDir(productionId) {
  assertSafeId(productionId, 'productionId');
  const dir = path.join(DATA_DIR, 'temp', productionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function keyframesDir(productionId, assetId) {
  assertSafeId(productionId, 'productionId');
  assertSafeId(assetId, 'assetId');
  const dir = path.join(DATA_DIR, 'temp', productionId, 'keyframes', assetId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Allowlist of accepted upload types. The stored filename is always
// `${assetId}${ext}` from this table — the user's original filename is never
// used to build a filesystem path, only kept as a display label.
export const ACCEPTED_TYPES = {
  'video/mp4': { ext: '.mp4', category: 'VIDEO_CLIP' },
  'video/quicktime': { ext: '.mov', category: 'VIDEO_CLIP' },
  'video/webm': { ext: '.webm', category: 'VIDEO_CLIP' },
  'audio/mpeg': { ext: '.mp3', category: 'MUSIC' },
  'audio/mp3': { ext: '.mp3', category: 'MUSIC' },
  'audio/wav': { ext: '.wav', category: 'MUSIC' },
  'audio/x-wav': { ext: '.wav', category: 'MUSIC' },
  'audio/mp4': { ext: '.m4a', category: 'MUSIC' },
  'audio/aac': { ext: '.aac', category: 'MUSIC' },
  'image/png': { ext: '.png', category: 'REFERENCE_IMAGE' },
  'image/jpeg': { ext: '.jpg', category: 'REFERENCE_IMAGE' },
  'image/webp': { ext: '.webp', category: 'REFERENCE_IMAGE' },
};
