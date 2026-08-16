import { NextResponse } from 'next/server';
import { getVideoPromptsById, updateVideoPromptClipProgress } from '../../../../../../lib/db/repo';

export async function PATCH(req, { params }) {
  const body = await req.json().catch(() => ({}));
  const record = getVideoPromptsById(params.id);
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (body.sceneNumber == null || !body.field) {
    return NextResponse.json({ error: 'sceneNumber and field required' }, { status: 400 });
  }
  const updated = updateVideoPromptClipProgress(params.id, Number(body.sceneNumber), body.field, body.value);
  return NextResponse.json(updated);
}
