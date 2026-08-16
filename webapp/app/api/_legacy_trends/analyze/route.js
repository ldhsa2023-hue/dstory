import { NextResponse } from 'next/server';
import { buildTrendAnalysisPrompt } from '../../../../lib/prompts/trendAnalysis';
import { callOpenAI, hasApiKey } from '../../../../lib/openai';
import { GENRES } from '../../../../lib/scoring';

export async function POST(req) {
  const body = await req.json();
  const genreLabel = GENRES.find((g) => g.key === body.genre)?.label || body.genre || '';

  const prompt = buildTrendAnalysisPrompt({
    description: body.description,
    platform: body.platform,
    genreLabel,
    characterRef: body.characterRef,
  });

  if (!hasApiKey()) {
    return NextResponse.json({ mode: 'template', prompt, result: null });
  }

  try {
    const result = await callOpenAI(prompt, {
      system: '너는 유튜브 AI 콘텐츠 트렌드 분석 및 재해석 전문가다. 간결하고 실행 가능한 답을 한국어로 작성한다.',
    });
    return NextResponse.json({ mode: 'live', prompt, result });
  } catch (err) {
    return NextResponse.json({ mode: 'template', prompt, result: null, error: err.message }, { status: 200 });
  }
}
