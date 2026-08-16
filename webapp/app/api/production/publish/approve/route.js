import { NextResponse } from 'next/server';
import { getProduction, getPublishPack, upsertPublishPack, updateProduction } from '../../../../../lib/db/repo';

// Human Approval Gate (spec 63): never auto-published. This only marks the
// content package (metadata/publish pack) as human-approved — Phase 3 (actual
// video render) does not exist yet, so this is not a "final video" approval.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });
  const pack = getPublishPack(production.id);
  if (!pack) return NextResponse.json({ error: 'publish pack not generated yet' }, { status: 400 });

  const updatedPack = upsertPublishPack(production.id, { ready_to_publish: true });
  updateProduction(production.id, { status: 'READY TO PUBLISH' });

  return NextResponse.json(updatedPack);
}
