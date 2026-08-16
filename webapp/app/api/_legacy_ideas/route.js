import { NextResponse } from 'next/server';
import { readCollection, insertItem, deleteItem, genId } from '../../../lib/db';

export async function GET() {
  return NextResponse.json(readCollection('ideas'));
}

export async function POST(req) {
  const body = await req.json();
  const item = insertItem('ideas', {
    id: genId('idea'),
    title: body.title || '',
    genre: body.genre || '',
    format: body.format || 'shorts',
    logline: body.logline || '',
    characterRef: body.characterRef || '',
    reinterpretation: body.reinterpretation || '',
    source_trend_id: body.source_trend_id || null,
  });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = deleteItem('ideas', id);
  return NextResponse.json({ ok });
}
