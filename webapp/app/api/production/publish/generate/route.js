import { NextResponse } from 'next/server';
import { getEngine } from '../../../../../lib/ai/engine';
import { buildPublishPackPrompt } from '../../../../../lib/prompts/publishPack';
import {
  getProduction,
  getConcept,
  getHook,
  getPromptPack,
  getChannelProfile,
  upsertPublishPack,
} from '../../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const concept = getConcept(production.concept_id);
  const hook = production.hook_id ? getHook(production.hook_id) : null;
  const promptPack = getPromptPack(production.id);
  const profile = getChannelProfile();

  const prompt = buildPublishPackPrompt({ production, concept, hook, promptPack, profile });
  const system =
    '너는 메타데이터 에디터이자 정책 검토자다. 실제로 보여주지 않는 결과를 제목에서 약속하지 않는다. 최종 게시 승인은 항상 사용자 몫이다.';

  const engine = await getEngine();
  if (engine.constructor.name === 'ManualEngine') {
    return NextResponse.json({ mode: 'template', prompt });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 120000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message }, { status: 200 });
  }

  const publishPack = upsertPublishPack(production.id, {
    titles: data?.titles || [],
    description: data?.description || '',
    hashtags: data?.hashtags || [],
    tags: data?.tags || [],
    thumbnail_concepts: data?.thumbnail_concepts || [],
    pinned_comment: data?.pinned_comment || '',
    instagram_caption: data?.instagram_caption || '',
    instagram_hashtags: data?.instagram_hashtags || [],
    policy_review: { ...(data?.policy_review || {}), ai_disclosure: data?.ai_disclosure || null },
    qc_checklist: data?.content_qc || {},
    ready_to_publish: false,
  });

  return NextResponse.json({ mode: 'live', prompt, publishPack });
}
