import { NextResponse } from 'next/server';
import fs from 'fs';
import { getAsset, linkAssetToScene, deleteAsset } from '../../../../../lib/db/repo';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const asset = getAsset(params.id);
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const updated = linkAssetToScene(params.id, body.scene_number ?? null);
  return NextResponse.json(updated);
}

export async function DELETE(_req, { params }) {
  const asset = getAsset(params.id);
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });
  try {
    if (fs.existsSync(asset.stored_path)) fs.unlinkSync(asset.stored_path);
  } catch {
    // best-effort file cleanup; still remove the DB row
  }
  deleteAsset(params.id);
  return NextResponse.json({ ok: true });
}
