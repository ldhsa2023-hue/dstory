import { NextResponse } from 'next/server';
import { listTrends, updateTrendStatus, deleteTrend } from '../../../lib/db/repo';

export async function GET() {
  return NextResponse.json(listTrends());
}

export async function PATCH(req) {
  const body = await req.json();
  if (!body.id || !body.status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  const updated = updateTrendStatus(body.id, body.status);
  return NextResponse.json(updated);
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteTrend(id);
  return NextResponse.json({ ok: true });
}
