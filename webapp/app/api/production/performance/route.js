import { NextResponse } from 'next/server';
import { getProduction, getPerformanceRecord, upsertPerformanceRecord, updateProduction } from '../../../../lib/db/repo';

const NUMERIC_FIELDS = [
  'views', 'impressions', 'viewed', 'swiped_away', 'avg_view_duration_sec', 'avg_percentage_viewed',
  'likes', 'comments', 'shares', 'subscribers_gained', 'returning_viewers',
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  if (!productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  return NextResponse.json(getPerformanceRecord(productionId));
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  const patch = {};
  for (const f of NUMERIC_FIELDS) {
    if (body[f] !== undefined && body[f] !== '') patch[f] = Number(body[f]);
  }
  if (body.video_url !== undefined) patch.video_url = body.video_url;
  if (body.publish_date !== undefined) patch.publish_date = body.publish_date;

  const record = upsertPerformanceRecord(production.id, patch);
  if (production.status !== 'PUBLISHED') updateProduction(production.id, { status: 'PUBLISHED' });

  return NextResponse.json(record);
}
