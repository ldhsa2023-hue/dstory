import { NextResponse } from 'next/server';
import {
  getProduction,
  listAssetsByProduction,
  getCaptionTrack,
  getEffectTrack,
  listRenderJobsByProduction,
  listEditPlansByProduction,
  getHook,
} from '../../../../lib/db/repo';
import { runRender } from '../../../../lib/render/runner';
import { isFfprobeAvailable } from '../../../../lib/media/ffprobe';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function isFfmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  if (!productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  return NextResponse.json(listRenderJobsByProduction(productionId));
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  const preset = body.preset === 'FINAL' ? 'FINAL' : 'PREVIEW';

  const [ffmpegOk, ffprobeOk] = await Promise.all([isFfmpegAvailable(), isFfprobeAvailable()]);
  if (!ffmpegOk || !ffprobeOk) {
    return NextResponse.json(
      { error: 'FFmpeg/FFprobe가 이 환경에 설치되어 있지 않습니다. Settings의 SYSTEM STATUS를 확인하세요.' },
      { status: 503 }
    );
  }

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  const assets = listAssetsByProduction(production.id);
  const captionTrack = getCaptionTrack(production.id);
  const effectTrack = getEffectTrack(production.id);
  const editPlan = listEditPlansByProduction(production.id)[0] || null;
  const hook = production.hook_id ? getHook(production.hook_id) : null;

  const job = await runRender({
    production,
    assets,
    captionTrack,
    effectTrack,
    editPlan,
    hookText: hook?.hook_text || null,
    preset,
  });
  return NextResponse.json(job, { status: job.status === 'COMPLETED' ? 201 : 200 });
}
