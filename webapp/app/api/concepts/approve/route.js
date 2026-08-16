import { NextResponse } from 'next/server';
import { getConcept, updateConceptStatus, insertProduction, updateProduction, getChannelProfile } from '../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.conceptId) return NextResponse.json({ error: 'conceptId required' }, { status: 400 });

  const concept = getConcept(body.conceptId);
  if (!concept) return NextResponse.json({ error: 'concept not found' }, { status: 404 });

  updateConceptStatus(concept.id, 'approved');
  let production = insertProduction({
    concept_id: concept.id,
    title: concept.title,
    status: 'APPROVED',
    format: concept.format,
    target_duration: concept.length_sec,
    storyboard: [],
  });

  const channelProfile = getChannelProfile();
  const preferredProvider = channelProfile?.preferredVideoProvider;
  if (preferredProvider && preferredProvider !== 'higgsfield') {
    production = updateProduction(production.id, { video_provider: preferredProvider });
  }

  return NextResponse.json(production, { status: 201 });
}
