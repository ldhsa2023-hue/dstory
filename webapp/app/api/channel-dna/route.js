import { NextResponse } from 'next/server';
import {
  computeChannelDna,
  checkFormatFatigue,
  derivePromptLibrary,
  computeProviderPerformance,
} from '../../../lib/analytics/channelDna';

export async function GET() {
  return NextResponse.json({
    dna: computeChannelDna(),
    formatFatigue: checkFormatFatigue(),
    promptLibrary: derivePromptLibrary(),
    providerPerformance: computeProviderPerformance(),
  });
}
