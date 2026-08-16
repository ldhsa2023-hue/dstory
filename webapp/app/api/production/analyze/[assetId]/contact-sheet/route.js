import fs from 'fs';
import path from 'path';
import { getMediaAnalysisByAsset } from '../../../../../../lib/db/repo';

const DATA_DIR = path.join(process.cwd(), 'data');

export async function GET(_req, { params }) {
  const analysis = getMediaAnalysisByAsset(params.assetId);
  if (!analysis?.contact_sheet_path) return new Response('not found', { status: 404 });

  // Defense in depth: the path must resolve inside our own data dir even
  // though it always originates from our own keyframesDir() helper.
  const resolved = path.resolve(analysis.contact_sheet_path);
  if (!resolved.startsWith(path.resolve(DATA_DIR)) || !fs.existsSync(resolved)) {
    return new Response('not found', { status: 404 });
  }

  const stream = fs.createReadStream(resolved);
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'image/jpeg' } });
}
