// Turns real ffprobe measurements into PASS/WARNING/FAIL, per spec 5.
// Every rule here checks a number we actually measured — nothing inferred.
export function validateClip(technical, { plannedDurationSec, targetAspect } = {}) {
  const issues = [];

  if (!technical.hasVideo) {
    issues.push({ level: 'FAIL', message: '비디오 스트림이 없습니다 (손상되었거나 오디오 전용 파일).' });
  }
  if (!technical.width || !technical.height) {
    issues.push({ level: 'FAIL', message: '해상도를 확인할 수 없습니다 — 파일이 손상되었을 수 있습니다.' });
  }
  if (!technical.hasAudio) {
    issues.push({ level: 'WARNING', message: '오디오 트랙이 없습니다 (렌더에서는 어차피 배경음악으로 대체되므로 치명적이지 않음).' });
  }
  if (technical.width && technical.height && targetAspect) {
    const actual = technical.width / technical.height;
    const expected = targetAspect === '16:9' ? 16 / 9 : 9 / 16;
    if (Math.abs(actual - expected) / expected > 0.15) {
      issues.push({
        level: 'WARNING',
        message: `화면비가 예상(${targetAspect})과 다릅니다 (실측 ${technical.width}x${technical.height}). 렌더 시 크롭됩니다.`,
      });
    }
  }
  if (technical.bitrate && technical.bitrate < 300000) {
    issues.push({ level: 'WARNING', message: `비트레이트가 낮습니다 (${Math.round(technical.bitrate / 1000)}kbps) — 화질 저하 가능성.` });
  }
  if (plannedDurationSec && technical.duration_sec) {
    const diff = Math.abs(technical.duration_sec - plannedDurationSec);
    if (diff > 2) {
      issues.push({
        level: 'WARNING',
        message: `계획된 길이(${plannedDurationSec}s)와 실제 클립 길이(${technical.duration_sec.toFixed(1)}s) 차이가 큽니다.`,
      });
    }
  }
  if (technical.rotation) {
    issues.push({ level: 'WARNING', message: `회전 메타데이터가 있습니다 (${technical.rotation}°) — 렌더 결과가 예상과 다를 수 있습니다.` });
  }
  if (technical.fps && technical.fps < 15) {
    issues.push({ level: 'WARNING', message: `프레임레이트가 낮습니다 (${technical.fps}fps).` });
  }

  const status = issues.some((i) => i.level === 'FAIL') ? 'FAIL' : issues.length > 0 ? 'WARNING' : 'PASS';
  return { status, issues };
}
