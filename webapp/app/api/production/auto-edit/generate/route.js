import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildAutoEditPrompt } from '../../../../../lib/prompts/autoEditDirector';
import { buildGlobalSignalMap } from '../../../../../lib/media/timelineMap';
import { computeHookReadiness } from '../../../../../lib/media/hookDetector';
import {
  getProduction,
  getHook,
  getCaptionTrack,
  getEffectTrack,
  listMediaAnalysesByProduction,
  insertEditPlan,
} from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  const intensity = ['MINIMAL', 'BALANCED', 'AGGRESSIVE'].includes(body.intensity) ? body.intensity : 'BALANCED';

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  const mediaAnalyses = listMediaAnalysesByProduction(production.id);
  if (mediaAnalyses.length === 0) {
    return NextResponse.json(
      { error: 'ANALYZE 탭에서 클립을 먼저 분석해야 Auto Edit을 실행할 수 있습니다.' },
      { status: 400 }
    );
  }

  const hook = production.hook_id ? getHook(production.hook_id) : null;
  const captionTrack = getCaptionTrack(production.id);
  const effectTrack = getEffectTrack(production.id);
  const signalMap = buildGlobalSignalMap(production.storyboard || [], mediaAnalyses);
  const scene1Analysis = mediaAnalyses.find((a) => a.scene_number === 1);
  const hookReadiness = computeHookReadiness({ scene1Analysis, hook });

  const prompt = buildAutoEditPrompt({ production, signalMap, hook, captionTrack, effectTrack, intensity, hookReadiness });
  const system = '너는 Auto Edit Director다. 실제로 측정되지 않은 타임스탬프를 절대 만들지 않는다.';

  const engine = await getEngine();
  if (engine.constructor.name === 'ManualEngine') {
    return NextResponse.json({ mode: 'template', prompt, hookReadiness, signalMap });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 120000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message, hookReadiness, signalMap }, { status: 200 });
  }

  const decisions = Array.isArray(data?.decisions) ? data.decisions : [];
  const plan = insertEditPlan({
    production_id: production.id,
    intensity,
    hook_score: hookReadiness,
    signal_map: signalMap,
    decisions,
  });

  return NextResponse.json({ mode: 'live', prompt, plan });
}
