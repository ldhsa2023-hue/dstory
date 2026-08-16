import { NextResponse } from 'next/server';
import { getAsset, insertBeatAnalysis } from '../../../../../lib/db/repo';
import { decodePcm } from '../../../../../lib/audio/pcmDecode';
import { analyzeBeat } from '../../../../../lib/audio/beatAnalyzer';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  if (!body.assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 });

  const asset = getAsset(body.assetId);
  if (!asset) return NextResponse.json({ error: 'asset not found' }, { status: 404 });
  if (asset.type !== 'MUSIC') {
    return NextResponse.json({ error: 'MUSIC 타입 자산만 Beat 분석이 가능합니다.' }, { status: 400 });
  }

  let samples, sampleRate;
  try {
    ({ samples, sampleRate } = await decodePcm(asset.stored_path));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const result = analyzeBeat(samples, sampleRate);
  const record = insertBeatAnalysis(body.productionId, body.assetId, result);
  return NextResponse.json(record);
}
