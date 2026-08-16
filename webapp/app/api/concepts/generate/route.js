import { NextResponse } from 'next/server';
import { getEngine } from '../../../../lib/ai/engine';
import { buildConceptPrompt } from '../../../../lib/prompts/conceptLab';
import { getChannelProfile, getTrend, insertConcept } from '../../../../lib/db/repo';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.trendId) return NextResponse.json({ error: 'trendId required' }, { status: 400 });

  const trend = getTrend(body.trendId);
  if (!trend) return NextResponse.json({ error: 'trend not found' }, { status: 404 });
  const profile = getChannelProfile();

  const prompt = buildConceptPrompt({ trend, profile });
  const system = '너는 오리지널리티를 지키는 콘텐츠 기획자다. 원본을 복제하지 않는다.';

  const engine = await getEngine();
  const isManual = engine.constructor.name === 'ManualEngine';
  if (isManual) {
    return NextResponse.json({ mode: 'template', prompt, concepts: [] });
  }

  let data;
  try {
    ({ data } = await engine.generateJSON({ prompt, system, allowedTools: [], timeoutMs: 120000 }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message, concepts: [] }, { status: 200 });
  }

  const candidates = Array.isArray(data) ? data : [];
  const inserted = candidates
    .filter((c) => c && c.title)
    .map((c) =>
      insertConcept({
        trend_id: trend.id,
        title: c.title,
        logline: c.logline,
        why_now: c.why_now,
        genre: c.genre,
        format: c.format,
        length_sec: c.length_sec,
        clip_count: c.clip_count,
        differentiation: c.differentiation || [],
        raw_json: c,
      })
    );

  return NextResponse.json({ mode: 'live', prompt, concepts: inserted });
}
