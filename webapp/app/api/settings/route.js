import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'fs';
import path from 'path';
import { engineStatus } from '../../../lib/ai/engine';
import { getDb } from '../../../lib/db/sqlite';

const execFileAsync = promisify(execFile);

async function checkBinary(bin, args = ['-version']) {
  try {
    await execFileAsync(bin, args, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

function checkWorkspaceWritable() {
  const dir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const testFile = path.join(dir, '.write-test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const [ai, ffmpeg, ffprobe] = await Promise.all([
    engineStatus(),
    checkBinary('ffmpeg', ['-version']),
    checkBinary('ffprobe', ['-version']),
  ]);

  let sqliteReady = false;
  try {
    getDb();
    sqliteReady = true;
  } catch {
    sqliteReady = false;
  }

  return NextResponse.json({
    claudeCli: ai.claudeCliAvailable,
    engine: ai.engine,
    sqlite: sqliteReady,
    workspaceWritable: checkWorkspaceWritable(),
    ffmpeg,
    ffprobe,
  });
}
