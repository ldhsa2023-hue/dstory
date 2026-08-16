import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildCaptionPrompt, captionsToSrt, captionsToVtt } from '../../../../../lib/prompts/captionEngine';
import { getProduction, getConcept, getHook, getPromptPack, upsertCaptionTrack } from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  const hook = production.hook_id ? getHook(production.hook_id) : null;
  const promptPack = getPromptPack(production.id);

  const prompt = buildCaptionPrompt({ production, concept, hook, promptPack });
  const system = '너는 Shorts 자막 디자이너다. 모든 말을 자막으로 옮기지 않는다.';

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

  const captions = Array.isArray(data?.captions) ? data.captions : [];
  const captionTrack = upsertCaptionTrack(production.id, {
    captions,
    srt: captionsToSrt(captions),
    vtt: captionsToVtt(captions),
  });

  return NextResponse.json({ mode: 'live', prompt, captionTrack });
}
