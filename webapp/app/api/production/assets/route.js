import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ACCEPTED_TYPES, assetDir } from '../../../../lib/media/paths';
import { probeFile } from '../../../../lib/media/ffprobe';
import { getProduction, insertAsset, listAssetsByProduction, genId } from '../../../../lib/db/repo';

const MAX_BYTES = 300 * 1024 * 1024; // 300MB, generous for local Shorts-length clips

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  if (!productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  return NextResponse.json(listAssetsByProduction(productionId));
}

export async function POST(req) {
  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'multipart/form-data 요청이 아닙니다.' }, { status: 400 });
  }

  const productionId = formData.get('productionId');
  const typeOverride = formData.get('type');
  const file = formData.get('file');

  if (!productionId || typeof productionId !== 'string') {
    return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  }
  const production = getProduction(productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `파일이 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB)` }, { status: 413 });
  }

  // Allowlist by MIME type only — the browser-supplied original filename is
  // never used to construct a filesystem path (prevents path traversal /
  // command-argument injection via a crafted filename).
  const accepted = ACCEPTED_TYPES[file.type];
  if (!accepted) {
    return NextResponse.json(
      { error: `지원하지 않는 파일 형식입니다: ${file.type || 'unknown'}. 허용: mp4/mov/webm, mp3/wav/m4a/aac, png/jpg/webp` },
      { status: 415 }
    );
  }

  const assetId = genId('asset');
  const dir = assetDir(productionId);
  const storedPath = path.join(dir, `${assetId}${accepted.ext}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(storedPath, buffer);

  let probe = { duration_sec: null, width: null, height: null, fps: null, codec: null };
  if (accepted.category !== 'REFERENCE_IMAGE') {
    try {
      probe = await probeFile(storedPath);
    } catch (err) {
      // Keep the uploaded file but surface the probe failure — never invent
      // technical metadata we didn't actually measure.
      probe = { duration_sec: null, width: null, height: null, fps: null, codec: null, probeError: err.message };
    }
  }

  const type = typeof typeOverride === 'string' && typeOverride ? typeOverride : accepted.category;
  const originalFilename = typeof file.name === 'string' ? file.name.replace(/[/\\]/g, '_').slice(0, 200) : '';

  const asset = insertAsset({
    id: assetId,
    production_id: productionId,
    type,
    original_filename: originalFilename,
    stored_path: storedPath,
    mime_type: file.type,
    duration_sec: probe.duration_sec,
    width: probe.width,
    height: probe.height,
    fps: probe.fps,
    codec: probe.codec,
    source_type: formData.get('sourceType') || 'unknown',
    license_note: formData.get('licenseNote') || '',
    creator: formData.get('creator') || '',
    source_url: formData.get('sourceUrl') || '',
    commercial_use_confirmed: formData.get('commercialUseConfirmed') === 'true',
  });

  return NextResponse.json({ asset, probeWarning: probe.probeError || null }, { status: 201 });
}
