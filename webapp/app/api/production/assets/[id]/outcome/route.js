import { NextResponse } from 'next/server';
import { getAsset, setAssetGenerationOutcome } from '../../../../../../lib/db/repo';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const asset = getAsset(params.id);
  if (!asset) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const updated = setAssetGenerationOutcome(params.id, body.outcome, body.failureReason);
  return NextResponse.json(updated);
}
