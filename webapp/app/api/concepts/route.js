import { NextResponse } from 'next/server';
import { listConcepts } from '../../../lib/db/repo';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const trendId = searchParams.get('trendId');
  return NextResponse.json(listConcepts(trendId ? { trend_id: trendId } : {}));
}
