import { NextResponse } from 'next/server';
import { buildSceneGenerationPrompt } from '../../../../lib/prompts/sceneGeneration';
import { callOpenAI, hasApiKey } from '../../../../lib/openai';
import { GENRES } from '../../../../lib/scoring';

function tryParseShots(text) {
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const raw = jsonMatch ? jsonMatch[0] : text;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    return null;
  }
  return null;
}

export async function POST(req) {
  const body = await req.json();
  const genreLabel = GENRES.find((g) => g.key === body.genre)?.label || body.genre || '';

  const prompt = buildSceneGenerationPrompt({
    logline: body.logline,
    genreLabel,
    format: body.format,
    characterRef: body.characterRef,
    reinterpretation: body.reinterpretation,
    shotCountHint: body.shotCountHint,
  });

  if (!hasApiKey()) {
    return NextResponse.json({ mode: 'template', prompt, shots: null });
  }

  try {
    const result = await callOpenAI(prompt, {
      system: '너는 AI 생성 영상 씬 설계 전문가다. 요청받은 JSON 스키마를 정확히 지켜 출력한다.',
    });
    const shots = tryParseShots(result);
    return NextResponse.json({ mode: 'live', prompt, result, shots });
  } catch (err) {
    return NextResponse.json({ mode: 'template', prompt, shots: null, error: err.message }, { status: 200 });
  }
}
