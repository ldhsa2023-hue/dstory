import { NextResponse } from 'next/server';
import { getProduction, upsertPerformanceRecord, updateProduction } from '../../../../../lib/db/repo';

// Minimal CSV import: header row + one data row, matching our own field
// names. Not a general-purpose CSV parser — quoted/escaped commas aren't
// supported, by design (spec 62 asks for "at least manual + CSV", not a
// full format-detection engine).
const KNOWN_FIELDS = new Set([
  'video_url', 'publish_date', 'views', 'impressions', 'viewed', 'swiped_away',
  'avg_view_duration_sec', 'avg_percentage_viewed', 'likes', 'comments', 'shares',
  'subscribers_gained', 'returning_viewers',
]);
const NUMERIC_FIELDS = new Set([
  'views', 'impressions', 'viewed', 'swiped_away', 'avg_view_duration_sec', 'avg_percentage_viewed',
  'likes', 'comments', 'shares', 'subscribers_gained', 'returning_viewers',
]);

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  if (!body.csvText) return NextResponse.json({ error: 'csvText required' }, { status: 400 });

  const production = getProduction(body.productionId);
  if (!production) return NextResponse.json({ error: 'production not found' }, { status: 404 });

  const lines = body.csvText.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV는 헤더 행 + 데이터 행이 최소 1개씩 필요합니다.' }, { status: 400 });
  }
  const headers = lines[0].split(',').map((h) => h.trim());
  const values = lines[1].split(',').map((v) => v.trim());

  const patch = {};
  const unknownColumns = [];
  headers.forEach((h, i) => {
    if (!KNOWN_FIELDS.has(h)) {
      if (h) unknownColumns.push(h);
      return;
    }
    const raw = values[i];
    if (raw === undefined || raw === '') return;
    patch[h] = NUMERIC_FIELDS.has(h) ? Number(raw) : raw;
  });

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      {
        error: `인식된 컬럼이 없습니다. 허용 컬럼: ${[...KNOWN_FIELDS].join(', ')}`,
        unknownColumns,
      },
      { status: 400 }
    );
  }

  const record = upsertPerformanceRecord(production.id, patch);
  if (production.status !== 'PUBLISHED') updateProduction(production.id, { status: 'PUBLISHED' });

  return NextResponse.json({ record, unknownColumns });
}
