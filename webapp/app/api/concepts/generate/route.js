import { NextResponse } from 'next/server';
import { getEngine } from '../../../../lib/ai/engine';
import { buildConceptPrompt } from '../../../../lib/prompts/conceptLab';
import { summarizeChannelDnaForPrompt } from '../../../../lib/analytics/channelDna';
import { getChannelProfile, getTrend, insertConcept } from '../../../../lib/db/repo';

function persistCandidates(candidates, trendId) {
  return candidates
    .filter((c) => c && c.title)
    .map((c) =>
      insertConcept({
        trend_id: trendId,
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
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!body.trendId) return NextResponse.json({ error: 'trendId required' }, { status: 400 });

  const trend = getTrend(body.trendId);
  if (!trend) return NextResponse.json({ error: 'trend not found' }, { status: 404 });

  // Manual paste-back: user ran the generated prompt in an external tool
  // (ChatGPT, claude.ai, ...) themselves and is submitting the JSON result.
  if (typeof body.manualResult === 'string' && body.manualResult.trim()) {
    let candidates;
    try {
      candidates = JSON.parse(body.manualResult);
    } catch (err) {
      return NextResponse.json({ mode: 'error', error: `JSON 파싱 실패: ${err.message}`, concepts: [] }, { status: 200 });
    }
    if (!Array.isArray(candidates)) {
      return NextResponse.json(
        { mode: 'error', error: 'JSON 배열이어야 합니다 (컨셉 후보 목록 전체를 [ ]로 감싸서 붙여넣으세요).', concepts: [] },
        { status: 200 }
      );
    }
    const inserted = persistCandidates(candidates, trend.id);
    return NextResponse.json({ mode: 'live', concepts: inserted });
  }

  const profile = getChannelProfile();
  const channelDnaSummary = summarizeChannelDnaForPrompt();

  const prompt = buildConceptPrompt({ trend, profile, channelDnaSummary });
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
  const inserted = persistCandidates(candidates, trend.id);

  return NextResponse.json({ mode: 'live', prompt, concepts: inserted });
}
