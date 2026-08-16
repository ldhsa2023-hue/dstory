import {
  listAllPerformanceWithProduction,
  listRecentProductionsWithDetail,
  listSuccessfulClipAssets,
  getConcept,
  getHook,
  getAudioPlan,
  getPromptPack,
  getEffectTrack,
  getCaptionTrack,
} from '../db/repo';

// "Enough data to compare" is a hand-picked minimum, not a significance
// test — documented in IMPLEMENTATION_PLAN.md's Phase 4 section. Below this,
// the page must say "not enough data" instead of guessing.
export const CHANNEL_DNA_THRESHOLD = 3;

function assembleDna(perfRow) {
  const concept = perfRow.concept_id ? getConcept(perfRow.concept_id) : null;
  const hook = perfRow.hook_id ? getHook(perfRow.hook_id) : null;
  const audioPlan = getAudioPlan(perfRow.production_id);
  const captionTrack = getCaptionTrack(perfRow.production_id);
  const effectTrack = getEffectTrack(perfRow.production_id);

  return {
    production_id: perfRow.production_id,
    title: perfRow.production_title,
    genre: concept?.genre || null,
    hook_type: hook?.type || null,
    length_sec: perfRow.target_duration,
    clip_count: (perfRow.storyboard || []).length,
    music_genre: audioPlan?.blueprint?.genre || null,
    music_energy: audioPlan?.blueprint?.energy || null,
    caption_count: captionTrack?.captions?.length ?? null,
    effect_count: effectTrack?.effects?.length ?? null,
    views: perfRow.views,
    avg_percentage_viewed: perfRow.avg_percentage_viewed,
    subscribers_gained: perfRow.subscribers_gained,
    likes: perfRow.likes,
  };
}

function groupAverage(rows, keyFn, metricFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const metric = metricFn(row);
    if (key == null || metric == null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(metric);
  }
  return [...groups.entries()]
    .map(([key, values]) => ({
      key,
      count: values.length,
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
    }))
    .sort((a, b) => b.avg - a.avg);
}

export function computeChannelDna() {
  const perfRows = listAllPerformanceWithProduction();
  const dnaRows = perfRows.map(assembleDna);
  const sufficient = dnaRows.length >= CHANNEL_DNA_THRESHOLD;

  if (!sufficient) {
    return {
      sufficient: false,
      count: dnaRows.length,
      threshold: CHANNEL_DNA_THRESHOLD,
      rows: dnaRows,
    };
  }

  const byViews = (r) => r.views;
  const byRetention = (r) => r.avg_percentage_viewed;

  return {
    sufficient: true,
    count: dnaRows.length,
    threshold: CHANNEL_DNA_THRESHOLD,
    rows: dnaRows,
    bestByHookType: groupAverage(dnaRows, (r) => r.hook_type, byViews),
    bestByGenre: groupAverage(dnaRows, (r) => r.genre, byViews),
    bestByMusicEnergy: groupAverage(dnaRows, (r) => r.music_energy, byRetention),
    retentionByHookType: groupAverage(dnaRows, (r) => r.hook_type, byRetention),
    topPerformers: [...dnaRows].filter((r) => r.views != null).sort((a, b) => b.views - a.views).slice(0, 3),
  };
}

export function summarizeChannelDnaForPrompt() {
  const dna = computeChannelDna();
  if (!dna.sufficient) return null;
  const topHook = dna.bestByHookType[0];
  const topGenre = dna.bestByGenre[0];
  const topMusic = dna.bestByMusicEnergy[0];
  return (
    `실제 게시 성과 ${dna.count}건 기준 Channel DNA: ` +
    `조회수 기준 최고 성과 Hook 유형은 "${topHook?.key}"(평균 ${topHook?.avg}회, ${topHook?.count}건), ` +
    `최고 성과 장르는 "${topGenre?.key}"(평균 ${topGenre?.avg}회). ` +
    `유지율 기준 최고 성과 음악 에너지는 "${topMusic?.key}"(평균 ${topMusic?.avg}%). ` +
    `이는 소량의 실제 데이터에 기반한 참고 정보이며 절대적 규칙이 아니다.`
  );
}

// Format Fatigue: purely metadata-based, works even with zero performance
// data — looks at the most recent N productions regardless of publish state.
export function checkFormatFatigue(limit = 5) {
  const recent = listRecentProductionsWithDetail(limit);
  const withDetail = recent.map((p) => ({
    production_id: p.id,
    title: p.title,
    genre: p.concept_id ? getConcept(p.concept_id)?.genre : null,
    hook_type: p.hook_id ? getHook(p.hook_id)?.type : null,
  }));

  const warnings = [];
  for (const field of ['genre', 'hook_type']) {
    const counts = new Map();
    withDetail.forEach((p) => {
      if (!p[field]) return;
      counts.set(p[field], (counts.get(p[field]) || 0) + 1);
    });
    for (const [value, count] of counts) {
      if (count >= 3) {
        warnings.push({
          field,
          value,
          count,
          of: withDetail.length,
          message: `최근 ${withDetail.length}개 Production 중 ${count}개가 동일한 ${field === 'genre' ? '장르' : 'Hook 유형'}("${value}")을 사용했습니다.`,
        });
      }
    }
  }

  return { checked: withDetail.length, productions: withDetail, warnings };
}

// Prompt Learning: no separate library table — just surface the Higgsfield
// prompts for scenes whose linked clip was reported SUCCESS.
export function derivePromptLibrary() {
  const successAssets = listSuccessfulClipAssets();
  const entries = [];
  for (const asset of successAssets) {
    if (asset.linked_scene_number == null) continue;
    const pack = getPromptPack(asset.production_id);
    const scenePrompt = pack?.higgsfield_prompts?.find((p) => p.scene_number === asset.linked_scene_number);
    if (!scenePrompt) continue;
    entries.push({
      production_id: asset.production_id,
      asset_id: asset.id,
      scene_number: asset.linked_scene_number,
      prompt: scenePrompt.prompt,
      global_visual_lock: pack.global_visual_lock,
    });
  }
  return entries;
}
