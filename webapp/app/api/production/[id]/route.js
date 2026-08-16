import { NextResponse } from 'next/server';
import {
  getProduction,
  getConcept,
  listHooksByConcept,
  getPromptPack,
  getAudioPlan,
  getCaptionTrack,
  getEffectTrack,
  getPublishPack,
  listAssetsByProduction,
  listRenderJobsByProduction,
  listMediaAnalysesByProduction,
  listEditPlansByProduction,
  getPerformanceRecord,
  listVideoPromptsByProduction,
  updateProduction,
} from '../../../../lib/db/repo';

export async function GET(_req, { params }) {
  const production = getProduction(params.id);
  if (!production) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const concept = production.concept_id ? getConcept(production.concept_id) : null;
  const hooks = concept ? listHooksByConcept(concept.id) : [];
  const promptPack = getPromptPack(production.id);
  const audioPlan = getAudioPlan(production.id);
  const captionTrack = getCaptionTrack(production.id);
  const effectTrack = getEffectTrack(production.id);
  const publishPack = getPublishPack(production.id);
  const assets = listAssetsByProduction(production.id);
  const renderJobs = listRenderJobsByProduction(production.id);
  const mediaAnalyses = listMediaAnalysesByProduction(production.id);
  const editPlans = listEditPlansByProduction(production.id);
  const performance = getPerformanceRecord(production.id);
  const videoPrompts = listVideoPromptsByProduction(production.id);
  return NextResponse.json({
    production,
    concept,
    hooks,
    promptPack,
    audioPlan,
    captionTrack,
    effectTrack,
    publishPack,
    assets,
    renderJobs,
    mediaAnalyses,
    editPlans,
    performance,
    videoPrompts,
  });
}

export async function PATCH(req, { params }) {
  const body = await req.json();
  const updated = updateProduction(params.id, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}
