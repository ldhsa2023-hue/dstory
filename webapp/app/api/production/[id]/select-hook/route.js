import { NextResponse } from 'next/server';
import { getProduction, selectHook, updateProduction } from '../../../../../lib/db/repo';

export async function POST(req, { params }) {
  const body = await req.json().catch(() => ({}));
  if (!body.hookId) return NextResponse.json({ error: 'hookId required' }, { status: 400 });

  const production = getProduction(params.id);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  selectHook(production.concept_id, body.hookId);
  const updated = updateProduction(params.id, { hook_id: body.hookId });
  return NextResponse.json(updated);
}
