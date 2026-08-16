import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildAudioDirectorPrompt } from '../../../../../lib/prompts/audioDirector';
import { getProduction, getConcept, getHook, upsertAudioPlan } from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  const hook = production.hook_id ? getHook(production.hook_id) : null;

  const prompt = buildAudioDirectorPrompt({ production, concept, hook });
  const system = '너는 Audio Director다. 음악 파일을 직접 생성하지 않고, 프롬프트와 큐시트만 설계한다.';

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

  const audioPlan = upsertAudioPlan(production.id, {
    blueprint: data?.blueprint || {},
    music_prompt: data?.music_prompt || '',
    music_timeline: data?.music_timeline || [],
    sfx_cues: data?.sfx_cues || [],
  });

  return NextResponse.json({ mode: 'live', prompt, audioPlan });
}
