import { computeSceneOffsets } from '../media/timelineMap';

// Only effects with a stable, well-understood ffmpeg realization are ever
// applied — no zoompan (frame-animated), no cross-clip xfade. Anything else
// is reported as skipped with a real reason, never silently dropped.
export const ZOOM_TYPES = new Set(['PUNCH_ZOOM', 'MICRO_ZOOM', 'PAYOFF_EMPHASIS']);
const ZOOM_FACTORS = { LOW: 1.1, MEDIUM: 1.25, HIGH: 1.4 };
const SPEED_FACTORS = { LOW: 1.25, MEDIUM: 1.5, HIGH: 2 };
const SUPPORTED_SEGMENT_TYPES = new Set(['SPEED_RAMP', 'FREEZE', 'TRIM', ...ZOOM_TYPES]);

const UNSUPPORTED_REASONS = {
  CUT: '앵커 표시일 뿐 자체 필터 동작이 없음 — 하드컷 concat이 이미 컷 지점 역할을 함',
  TRANSITION: '클립 간 xfade는 세그먼트 편집과 얽히면 필터 그래프가 깨지기 쉬워 이번 버전에서 보류',
  IMPACT_SFX_CUE: '실제로 매칭되는 SFX 오디오 자산이 없음 — 없는 오디오를 상상해서 넣지 않음',
  MUSIC_CUE: '실제로 매칭되는 SFX 오디오 자산이 없음 — 없는 오디오를 상상해서 넣지 않음',
  LOOP_SUGGESTION: '단일 패스 렌더 동작이 아니라 편집자를 위한 전략 제안',
  PACE_NOTE: '필터 매핑이 정의되지 않은 참고용 노트',
};

export function zoomFactorFor(strength) {
  return ZOOM_FACTORS[strength] || ZOOM_FACTORS.MEDIUM;
}

export function speedFactorFor(strength) {
  return SPEED_FACTORS[strength] || SPEED_FACTORS.MEDIUM;
}

// clips: manifest clip list (scene_number, actual_duration_sec/planned_duration_sec).
// decisions: the latest EditPlan's decisions (global timeline coordinates).
// Returns { clipSegments: Map<scene_number, Segment[]>, textOverlays: [...], report: [...] }
// where Segment = { start, end, effect: {type, parameters} | null } in clip-local seconds,
// and a segment whose effect.type === 'TRIM' is meant to be dropped entirely (dead time cut out).
export function computeClipEdits({ storyboard, clips, decisions, hookText }) {
  const sceneOffsets = computeSceneOffsets(storyboard);
  const clipByScene = new Map(clips.map((c) => [c.scene_number, c]));
  const report = [];
  const textOverlays = [];

  const state = new Map();
  for (const scene of storyboard || []) {
    const clip = clipByScene.get(scene.scene_number);
    if (!clip) continue;
    const duration = clip.actual_duration_sec || clip.planned_duration_sec || 0;
    if (duration <= 0) continue;
    state.set(scene.scene_number, { duration, boundaries: new Set([0, duration]), effects: [] });
  }

  for (const decision of decisions || []) {
    const summary = { type: decision.type, timestamp: decision.timestamp, reason: decision.reason, track: decision.track };

    if (decision.enabled === false) {
      report.push({ ...summary, applied: false, skipReason: '사용자가 비활성화(enabled=false)' });
      continue;
    }

    if (decision.type === 'HOOK_TEXT_TIMING') {
      if (!hookText) {
        report.push({ ...summary, applied: false, skipReason: '선택된 Hook 텍스트가 없음' });
        continue;
      }
      const start = Math.max(0, decision.timestamp);
      const end = Math.max(start + 0.1, decision.endTimestamp ?? decision.timestamp + 2);
      textOverlays.push({ start, end, text: hookText });
      report.push({ ...summary, applied: true });
      continue;
    }

    if (!SUPPORTED_SEGMENT_TYPES.has(decision.type)) {
      report.push({
        ...summary,
        applied: false,
        skipReason: UNSUPPORTED_REASONS[decision.type] || `알 수 없는 type(${decision.type}) — 필터 매핑 정의 없음`,
      });
      continue;
    }

    const scene = sceneOffsets.find((o) => decision.timestamp >= o.start && decision.timestamp < o.end);
    if (!scene) {
      report.push({ ...summary, applied: false, skipReason: '스토리보드 범위를 벗어난 timestamp' });
      continue;
    }
    const segInfo = state.get(scene.scene_number);
    if (!segInfo) {
      report.push({ ...summary, applied: false, skipReason: `Scene ${scene.scene_number}에 연결된 클립이 없어 렌더 대상에서 제외됨` });
      continue;
    }

    const localStart = Math.max(0, Number((decision.timestamp - scene.start).toFixed(3)));
    const rawEnd = (decision.endTimestamp ?? decision.timestamp + 0.5) - scene.start;
    const localEnd = Math.min(segInfo.duration, Number(rawEnd.toFixed(3)));
    if (localEnd - localStart < 0.05) {
      report.push({ ...summary, applied: false, skipReason: '클립 실제 길이 기준 구간이 0에 가까움' });
      continue;
    }

    const reportIndex = report.length;
    segInfo.boundaries.add(localStart);
    segInfo.boundaries.add(localEnd);
    segInfo.effects.push({ start: localStart, end: localEnd, type: decision.type, parameters: decision.parameters || {}, reportIndex, matched: false });
    report.push({ ...summary, applied: true, sceneNumber: scene.scene_number, localStart, localEnd });
  }

  const clipSegments = new Map();
  for (const [sceneNumber, info] of state) {
    const bounds = [...info.boundaries].sort((a, b) => a - b);
    const segments = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const start = bounds[i];
      const end = bounds[i + 1];
      if (end - start < 0.02) continue;
      const effect = info.effects.find((f) => Math.abs(f.start - start) < 0.02 && Math.abs(f.end - end) < 0.02);
      if (effect) effect.matched = true;
      segments.push({ start, end, effect: effect ? { type: effect.type, parameters: effect.parameters } : null });
    }
    clipSegments.set(sceneNumber, segments);

    // A decision whose interval got sliced up by another decision's boundary
    // (overlapping edits on the same clip) can't be realized as one clean
    // segment — flip its report entry to honestly reflect that instead of
    // claiming an effect that was never actually rendered.
    for (const effect of info.effects) {
      if (!effect.matched) {
        report[effect.reportIndex] = {
          ...report[effect.reportIndex],
          applied: false,
          skipReason: '다른 편집 구간과 겹쳐 이 효과만 분리 적용할 수 없음(겹치는 EditDecision 편집은 이번 버전에서 지원하지 않음)',
        };
      }
    }
  }

  return { clipSegments, textOverlays, report };
}
