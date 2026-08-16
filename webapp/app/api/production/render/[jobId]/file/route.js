import fs from 'fs';
import { getRenderJob } from '../../../../../../lib/db/repo';

export async function GET(req, { params }) {
  const job = getRenderJob(params.jobId);
  if (!job || job.status !== 'COMPLETED' || !job.output_path || !fs.existsSync(job.output_path)) {
    return new Response('not found', { status: 404 });
  }

  const stat = fs.statSync(job.output_path);
  const range = req.headers.get('range');

  if (!range) {
    const stream = fs.createReadStream(job.output_path);
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(stat.size),
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const match = /bytes=(\d+)-(\d*)/.exec(range);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
  const chunkSize = end - start + 1;

  const stream = fs.createReadStream(job.output_path, { start, end });
  return new Response(stream, {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(chunkSize),
    },
  });
}
