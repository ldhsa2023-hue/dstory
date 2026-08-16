import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { getCompiler } from '../../../../../lib/video/providerOrchestrator';
import {
  getProduction,
  getConcept,
  getHook,
  getPromptPack,
  listIngredientAssets,
  insertVideoPrompts,
  updateProduction,
} from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  if (!body.provider) return NextResponse.json({ error: 'provider required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  if (!production.storyboard || production.storyboard.length === 0) {
    return NextResponse.json(
      { error: 'Storyboard가 없습니다. 먼저 PROMPTS 탭(Higgsfield 기본 플로우)에서 최소 1회 생성해 Storyboard를 확보하세요.' },
      { status: 400 }
    );
  }

  let compiler;
  try {
    compiler = getCompiler(body.provider);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const concept = getConcept(production.concept_id);
  const hook = production.hook_id ? getHook(production.hook_id) : null;
  const existingPack = getPromptPack(production.id);
  const ingredients = listIngredientAssets(production.id);

  const prompt = compiler({
    storyboard: production.storyboard,
    concept,
    hook,
    globalVisualLock: existingPack?.global_visual_lock || '',
    generationMode: body.generationMode || 'auto',
    ingredients,
    audioIntent: body.audioIntent || 'NATURAL_ONLY',
  });
  const system = `너는 ${body.provider} 전용 영상 생성 프롬프트 컴파일러다. Story/Storyboard를 새로 만들지 않고 번역만 한다.`;

  const engine = await getEngine();
  if (engine.constructor.name === 'ManualEngine') {
    return NextResponse.json({ mode: 'template', prompt });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 150000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message }, { status: 200 });
  }

  const clips = Array.isArray(data?.clips) ? data.clips : [];
  const record = insertVideoPrompts(production.id, body.provider, body.generationMode || 'auto', data?.global_visual_lock, clips);
  updateProduction(production.id, { video_provider: body.provider });

  return NextResponse.json({ mode: 'live', prompt, record });
}
