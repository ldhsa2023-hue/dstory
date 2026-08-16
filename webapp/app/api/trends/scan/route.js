import { NextResponse } from 'next/server';
import { getEngine } from '../../../../lib/ai/engine';
import { buildTrendResearchPrompt } from '../../../../lib/prompts/trendResearch';
import { getChannelProfile, insertResearchRun, insertTrend } from '../../../../lib/db/repo';
import { computeChannelFitScore } from '../../../../lib/scoring';

// Shared by both the live (Claude CLI) path and the manual-paste path so a
// pasted ChatGPT/Claude.ai result is scored and stored exactly the same way
// a live WebSearch result would be — no separate, unverified code path.
function persistCandidates(candidates, { filters, engineLabel, rawPrompt, rawOutput, profile }) {
  const run = insertResearchRun({
    filters,
    engine: engineLabel,
    raw_prompt: rawPrompt,
    raw_output: rawOutput,
    trend_count: candidates.length,
    status: 'completed',
  });

  return candidates
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
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const filters = body.filters || {};
  const profile = getChannelProfile();

  // Manual paste-back: user ran the generated prompt in an external tool
  // (ChatGPT, claude.ai, ...) themselves and is submitting the JSON result.
  if (typeof body.manualResult === 'string' && body.manualResult.trim()) {
    let candidates;
    try {
      candidates = JSON.parse(body.manualResult);
    } catch (err) {
      return NextResponse.json({ mode: 'error', error: `JSON 파싱 실패: ${err.message}`, trends: [] }, { status: 200 });
    }
    if (!Array.isArray(candidates)) {
      return NextResponse.json(
        { mode: 'error', error: 'JSON 배열이어야 합니다 (트렌드 후보 목록 전체를 [ ]로 감싸서 붙여넣으세요).', trends: [] },
        { status: 200 }
      );
    }

    const inserted = persistCandidates(candidates, {
      filters,
      engineLabel: 'manual-paste',
      rawPrompt: body.originalPrompt || '',
      rawOutput: body.manualResult,
      profile,
    });
    return NextResponse.json({ mode: 'live', trends: inserted });
  }

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
      timeoutMs: 280000,
    }));
  } catch (err) {
    return NextResponse.json({ mode: 'error', prompt, error: err.message, trends: [] }, { status: 200 });
  }

  const candidates = Array.isArray(data) ? data : [];
  const inserted = persistCandidates(candidates, {
    filters,
    engineLabel: 'claude-cli',
    rawPrompt: prompt,
    rawOutput: raw,
    profile,
  });

  return NextResponse.json({ mode: 'live', prompt, trends: inserted });
}
