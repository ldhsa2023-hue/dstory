import { NextResponse } from 'next/server';
import { analyzeClip } from '../../../../lib/media/analyzeClip';
import { isFfprobeAvailable } from '../../../../lib/media/ffprobe';
import {
  getProduction,
  listAssetsByProduction,
  listMediaAnalysesByProduction,
  upsertMediaAnalysis,
} from '../../../../lib/db/repo';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  if (!productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  return NextResponse.json(listMediaAnalysesByProduction(productionId));
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const ffprobeOk = await isFfprobeAvailable();
  if (!ffprobeOk) {
    return NextResponse.json({ error: 'FFprobe/FFmpeg가 설치되어 있지 않습니다.' }, { status: 503 });
  }

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  const assets = listAssetsByProduction(production.id);
  const clips = assets.filter((a) => a.type === 'VIDEO_CLIP' && a.linked_scene_number != null);
  const storyboard = production.storyboard || [];

  const results = [];
  for (const asset of clips) {
    const scene = storyboard.find((s) => s.scene_number === asset.linked_scene_number);
    let analysis;
    try {
      analysis = await analyzeClip({
        asset,
        productionId: production.id,
        plannedDurationSec: scene?.duration_sec,
        targetAspect: production.format === 'longform' ? '16:9' : '9:16',
        sceneNumber: asset.linked_scene_number,
        hint: scene?.purpose,
      });
    } catch (err) {
      analysis = {
        production_id: production.id,
        asset_id: asset.id,
        scene_number: asset.linked_scene_number,
        technical: {},
        validation: { status: 'FAIL', issues: [{ level: 'FAIL', message: `분석 실패: ${err.message}` }] },
        signals: [],
        keyframes: [],
        visual_review: {},
      };
    }
    results.push(upsertMediaAnalysis(asset.id, analysis));
  }

  return NextResponse.json(results);
}
