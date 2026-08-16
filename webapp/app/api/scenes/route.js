import { NextResponse } from 'next/server';
import { readCollection, insertItem, deleteItem, genId } from '../../../lib/db';

export async function GET() {
  return NextResponse.json(readCollection('scenes'));
}

export async function POST(req) {
  const body = await req.json();
  const item = insertItem('scenes', {
    id: genId('scene'),
    idea_id: body.idea_id || null,
    title: body.title || '',
    genre: body.genre || '',
    format: body.format || 'shorts',
    characterRef: body.characterRef || '',
    shots: Array.isArray(body.shots) ? body.shots : [],
  });
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = deleteItem('scenes', id);
  return NextResponse.json({ ok });
}
