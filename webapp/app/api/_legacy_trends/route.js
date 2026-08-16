import { NextResponse } from 'next/server';
import { readCollection, insertItem, updateItem, deleteItem, genId } from '../../../lib/db';
import { computeTotal, decisionFromTotal, SCORE_FIELDS } from '../../../lib/scoring';

export async function GET() {
  return NextResponse.json(readCollection('trends'));
}

export async function POST(req) {
  const body = await req.json();
  const scores = {};
  for (const f of SCORE_FIELDS) {
    scores[f.key] = Number(body.scores?.[f.key]) || 1;
  }
  const total = computeTotal(scores);
  const decision = decisionFromTotal(total);

  const item = insertItem('trends', {
    id: genId('trend'),
    source: body.source || 'manual',
    platform: body.platform || '',
    trend_type: body.trend_type || '',
    description: body.description || '',
    genre: body.genre || '',
    analysis: body.analysis || '',
    reinterpretation: body.reinterpretation || '',
    scores,
    total,
    decision,
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(req) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch = { ...body };
  delete patch.id;

  if (body.scores) {
    const scores = {};
    for (const f of SCORE_FIELDS) {
      scores[f.key] = Number(body.scores[f.key]) || 1;
    }
    patch.scores = scores;
    patch.total = computeTotal(scores);
    patch.decision = decisionFromTotal(patch.total);
  }

  const updated = updateItem('trends', body.id, patch);
  if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = deleteItem('trends', id);
  return NextResponse.json({ ok });
}
