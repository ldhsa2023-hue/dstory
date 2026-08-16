import { NextResponse } from 'next/server';
import { getVideoPromptsById, setVideoPromptWinner } from '../../../../../../lib/db/repo';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const record = getVideoPromptsById(params.id);
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const updated = setVideoPromptWinner(params.id, !!body.isWinner);
  return NextResponse.json(updated);
}
