import { NextResponse } from 'next/server';
import { listProductions } from '../../../lib/db/repo';

export async function GET() {
  return NextResponse.json(listProductions());
}
