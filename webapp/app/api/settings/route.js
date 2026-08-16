import { NextResponse } from 'next/server';
import { readSettings, writeSettings } from '../../../lib/db';

export async function GET() {
  const settings = readSettings();
  return NextResponse.json({ hasKey: Boolean(settings.openaiApiKey) });
}

export async function POST(req) {
  const body = await req.json();
  writeSettings({ openaiApiKey: body.openaiApiKey || '' });
  return NextResponse.json({ hasKey: Boolean(body.openaiApiKey) });
}
