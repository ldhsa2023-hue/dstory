import { NextResponse } from 'next/server';
import { listEditPlansByProduction } from '../../../../lib/db/repo';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const productionId = searchParams.get('productionId');
  if (!productionId) return NextResponse.json({ error: 'productionId required' }, { status: 400 });
  return NextResponse.json(listEditPlansByProduction(productionId));
}
