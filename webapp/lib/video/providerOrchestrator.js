import { buildGoogleFlowPrompt } from './providers/googleFlowCompiler';
import { buildGenericPrompt } from './providers/genericCompiler';

// Routes a provider id to its compiler. Higgsfield deliberately does NOT go
// through this orchestrator — it keeps using the original, already-working
// lib/prompts/promptStudio.js + /api/production/prompts/generate route
// untouched, so this patch carries zero regression risk to it (see
// GOOGLE_FLOW_PROVIDER_PATCH_PLAN.md section 4). This orchestrator only
// exists to route the two NEW providers, and to give future providers
// (Kling, Runway, Seedance, ...) a single place to register.
const COMPILERS = {
  'google-flow': buildGoogleFlowPrompt,
  generic: buildGenericPrompt,
};

export function getCompiler(providerId) {
  const compiler = COMPILERS[providerId];
  if (!compiler) {
    throw new Error(
      `Provider "${providerId}"는 이 오케스트레이터로 라우팅되지 않습니다. 'higgsfield'는 기존 /api/production/prompts/generate를 그대로 사용하세요.`
    );
  }
  return compiler;
}

export function listOrchestratedProviders() {
  return Object.keys(COMPILERS);
}
