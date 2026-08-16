import { NextResponse } from 'next/server';
import { getProduction, getConcept, listHooksByConcept, getPromptPack, updateProduction } from '../../../../lib/db/repo';

export async function GET(_req, { params }) {
  const production = getProduction(params.id);
  if (!production) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const concept = production.concept_id ? getConcept(production.concept_id) : null;
  const hooks = concept ? listHooksByConcept(concept.id) : [];
  const promptPack = getPromptPack(production.id);
  return NextResponse.json({ production, concept, hooks, promptPack });
}

export async function PATCH(req, { params }) {
  const body = await req.json();
  const updated = updateProduction(params.id, body);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}
