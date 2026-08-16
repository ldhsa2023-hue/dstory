import { NextResponse } from 'next/server';
import {
  buildHiggsfieldMasterPrompt,
  buildHiggsfieldRequestFromShots,
  guideForRequest,
} from '../../../../lib/prompts/higgsfieldPrompt';

export async function POST(req) {
  const body = await req.json();
  const {
    shots = [],
    format = 'shorts',
    styleLock = '',
    needsCharacterConsistency = true,
    needsMultiShotCinematic = false,
    needs2K = false,
    budgetPriority = false,
    characterMediaId = '',
    trendSummary = '',
    reinterpretation = '',
    characterRef = '',
  } = body;

  const masterPrompt = buildHiggsfieldMasterPrompt({ trendSummary, reinterpretation, characterRef, format });

  const request = buildHiggsfieldRequestFromShots(shots, {
    format,
    styleLock,
    needsCharacterConsistency,
    needsMultiShotCinematic,
    needs2K,
    budgetPriority,
    characterMediaId,
  });

  const guide = guideForRequest(request);

  return NextResponse.json({ masterPrompt, request, guide });
}
