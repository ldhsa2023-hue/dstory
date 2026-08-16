import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildPromptPackPrompt } from '../../../../../lib/prompts/promptStudio';
import {
  getProduction,
  getConcept,
  getHook,
  getChannelProfile,
  updateProduction,
  upsertPromptPack,
} from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  if (!concept) return NextResponse.json({ error: 'concept not found' }, { status: 404 });
  const hook = production.hook_id ? getHook(production.hook_id) : null;
  const profile = getChannelProfile();
  const higgsfieldMode = body.higgsfieldMode || 'CINEMATIC';

  const prompt = buildPromptPackPrompt({ concept, hook, profile, higgsfieldMode });
  const system = '너는 프로덕션 디자이너다. 원본 트렌드나 타 크리에이터 콘텐츠를 그대로 재현하지 않는다.';

  const engine = await getEngine();
  const isManual = engine.constructor.name === 'ManualEngine';
  if (isManual) {
    return NextResponse.json({ mode: 'template', prompt });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 120000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message }, { status: 200 });
  }

  const scenes = Array.isArray(data?.scenes) ? data.scenes : [];
  const storyboard = scenes.map((s) => ({
    scene_number: s.scene_number,
    duration_sec: s.duration_sec,
    purpose: s.purpose,
  }));
  const imagePrompts = scenes.map((s) => ({ scene_number: s.scene_number, prompt: s.image_prompt }));
  const higgsfieldPrompts = scenes.map((s) => ({
    scene_number: s.scene_number,
    duration_sec: s.duration_sec,
    prompt: s.higgsfield_prompt,
  }));

  updateProduction(production.id, { storyboard, status: scenes.length > 0 ? 'PROMPTS READY' : production.status });
  const promptPack = upsertPromptPack(production.id, {
    global_visual_lock: data?.global_visual_lock || '',
    image_prompts: imagePrompts,
    higgsfield_prompts: higgsfieldPrompts,
    higgsfield_mode: higgsfieldMode,
  });

  return NextResponse.json({ mode: 'live', prompt, promptPack });
}
