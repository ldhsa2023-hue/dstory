import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildEffectPrompt } from '../../../../../lib/prompts/effectDirector';
import { getProduction, getConcept, getPromptPack, upsertEffectTrack } from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  const promptPack = getPromptPack(production.id);
  const budget = body.budget || 'BALANCED';

  const prompt = buildEffectPrompt({ production, concept, promptPack, budget });
  const system = '너는 Effect Director다. 목적 없는 효과는 절대 추가하지 않는다.';

  const engine = await getEngine();
  if (engine.constructor.name === 'ManualEngine') {
    return NextResponse.json({ mode: 'template', prompt });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 100000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message }, { status: 200 });
  }

  const effects = Array.isArray(data?.effects) ? data.effects : [];
  const effectTrack = upsertEffectTrack(production.id, { effects });

  return NextResponse.json({ mode: 'live', prompt, effectTrack });
}
