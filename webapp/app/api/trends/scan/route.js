import { NextResponse } from 'next/server';
import { getEngine } from '../../../../lib/ai/engine';
import { buildTrendResearchPrompt } from '../../../../lib/prompts/trendResearch';
import { getChannelProfile, insertResearchRun, insertTrend } from '../../../../lib/db/repo';
import { computeChannelFitScore } from '../../../../lib/scoring';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const filters = body.filters || {};
  const profile = getChannelProfile();

  const prompt = buildTrendResearchPrompt({ profile, filters });
  const system =
    '너는 트렌드 조사 전문가다. 확인되지 않은 데이터를 만들지 않는다. WebSearch로 실제 확인한 내용만 근거로 삼는다.';

  const engine = await getEngine();
  const isManual = engine.constructor.name === 'ManualEngine';

  if (isManual) {
    return NextResponse.json({ mode: 'template', prompt, trends: [] });
  }

  let data;
  let raw;
  try {
    ({ data, raw } = await engine.generateJSON({
      prompt,
      system,
      allowedTools: ['WebSearch', 'WebFetch'],
      timeoutMs: 170000,
    }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message, trends: [] }, { status: 200 });
  }

  const candidates = Array.isArray(data) ? data : [];
  const run = insertResearchRun({
    filters,
    engine: 'claude-cli',
    raw_prompt: prompt,
    raw_output: raw,
    trend_count: candidates.length,
    status: 'completed',
  });

  const inserted = candidates
    .filter((c) => c && c.name)
    .map((c) => {
      const channel_fit_score = computeChannelFitScore(c, profile);
      return insertTrend({
        research_run_id: run.id,
        name: c.name,
        platform: c.platform,
        stage: c.stage,
        momentum: c.momentum,
        evidence_confidence: c.evidence_confidence || 'UNKNOWN',
        cross_platform_signal: c.cross_platform_signal,
        competition: c.competition,
        higgsfield_fit: c.higgsfield_fit,
        originality_potential: c.originality_potential,
        series_potential: c.series_potential,
        risk: c.risk,
        opportunity_score: c.opportunity_score,
        channel_fit_score,
        raw_json: c,
      });
    });

  return NextResponse.json({ mode: 'live', prompt, run, trends: inserted });
}
