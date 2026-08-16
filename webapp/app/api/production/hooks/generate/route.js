import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildHookPrompt } from '../../../../../lib/prompts/hookEngine';
import { getProduction, getConcept, insertHook } from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  if (!concept) return NextResponse.json({ error: 'concept not found' }, { status: 404 });

  const prompt = buildHookPrompt({ concept });
  const system = '너는 Shorts Hook 카피라이터다. 실제로 보여주지 못할 결과를 약속하지 않는다.';

  const engine = await getEngine();
  const isManual = engine.constructor.name === 'ManualEngine';
  if (isManual) {
    return NextResponse.json({ mode: 'template', prompt, hooks: [] });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 90000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message, hooks: [] }, { status: 200 });
  }

  const candidates = Array.isArray(data) ? data : [];
  const inserted = candidates
    .filter((h) => h && h.type)
    .map((h) =>
      insertHook({
        concept_id: concept.id,
        type: h.type,
        hook_text: h.hook_text,
        narration: h.narration,
        scores: h.scores || {},
      })
    );

  return NextResponse.json({ mode: 'live', prompt, hooks: inserted });
}
