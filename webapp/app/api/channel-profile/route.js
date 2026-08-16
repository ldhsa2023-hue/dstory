import { NextResponse } from 'next/server';
import { getChannelProfile, saveChannelProfile } from '../../../lib/db/repo';

export async function GET() {
  return NextResponse.json(getChannelProfile());
}

export async function POST(req) {
  const body = await req.json();
  const saved = saveChannelProfile(body);
  return NextResponse.json(saved);
}
