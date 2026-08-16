'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PLATFORM_FILTERS = ['GLOBAL', 'KOREA', 'USA', 'JAPAN', 'FOOD', 'FAMILY', 'FANTASY', 'AI', 'ANIMATION', 'STORY', 'SATISFYING'];
const WINDOWS = ['24H', '72H', '7D', '30D'];

const STAGE_COLOR = {
  SEED: 'bg-neutral-200 text-neutral-700',
  EMERGING: 'bg-blue-100 text-blue-800',
  ACCELERATING: 'bg-accent text-white',
  MAINSTREAM: 'bg-amber-200 text-amber-900',
  SATURATED: 'bg-neutral-300 text-neutral-700',
  DECLINING: 'bg-neutral-300 text-neutral-500',
  REVIVAL: 'bg-accent2 text-white',
};

export default function TrendRadarPage() {
  const router = useRouter();
  const [trends, setTrends] = useState([]);
  const [platform, setPlatform] = useState('GLOBAL');
  const [window_, setWindow] = useState('7D');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [manualResultText, setManualResultText] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    fetch('/api/trends').then((r) => r.json()).then(setTrends);
  }

  async function handleScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/trends/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: { platform, window: window_ } }),
      });
      const data = await res.json();
      setScanResult(data);
      refresh();
    } finally {
      setScanning(false);
    }
  }

  async function handleManualSubmit() {
    setSubmittingManual(true);
    setManualError(null);
    try {
      const res = await fetch('/api/trends/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { platform, window: window_ },
          manualResult: manualResultText,
          originalPrompt: scanResult?.prompt || '',
        }),
      });
      const data = await res.json();
      if (data.mode === 'error') {
        setManualError(data.error);
        return;
      }
      setScanResult(data);
      setManualResultText('');
      refresh();
    } finally {
      setSubmittingManual(false);
    }
  }

  async function setStatus(id, status) {
    await fetch('/api/trends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    refresh();
  }

  async function handleDelete(id) {
    await fetch(`/api/trends?id=${id}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">TREND RADAR</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          SCAN NOW를 누르면 Claude가 WebSearch로 실제 트렌드를 조사해 Trend Card로 저장합니다. 확인되지 않은 수치는
          UNKNOWN으로 표시됩니다. Claude CLI가 감지되지 않으면 조사 프롬프트만 생성되어 직접 실행 후 붙여넣을 수 있습니다.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                platform === p ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                window_ === w ? 'bg-accent text-white border-accent' : 'border-neutral-300 text-neutral-600'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleScan} disabled={scanning}>
          {scanning ? 'SCANNING... (WebSearch 진행 중, 최대 ~2-3분)' : 'SCAN NOW'}
        </button>

        {scanResult?.mode === 'template' && (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
            <div>
              Claude CLI가 감지되지 않아 자동 실행되지 않았습니다. 아래 프롬프트를 Claude/ChatGPT에 직접 실행한 뒤, 나온
              JSON 배열 결과를 그대로 복사해서 아래 칸에 붙여넣고 등록하세요.
              <pre className="codebox mt-2">{scanResult.prompt}</pre>
            </div>
            <div>
              <p className="label mb-1">결과 붙여넣기 (JSON 배열)</p>
              <textarea
                className="input w-full font-mono text-xs"
                rows={8}
                placeholder='[{"name": "...", "platform": "...", ...}]'
                value={manualResultText}
                onChange={(e) => setManualResultText(e.target.value)}
              />
              <button
                className="btn-secondary text-xs mt-2"
                onClick={handleManualSubmit}
                disabled={submittingManual || !manualResultText.trim()}
              >
                {submittingManual ? '등록 중...' : '결과 등록'}
              </button>
              {manualError && <p className="text-red-600 mt-2">오류: {manualError}</p>}
            </div>
          </div>
        )}
        {scanResult?.mode === 'error' && (
          <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-700">
            조사 중 오류가 발생했습니다: {scanResult.error}
          </div>
        )}
        {scanResult?.mode === 'live' && (
          <div className="text-sm bg-accent2/10 border border-accent2/30 rounded-lg p-3">
            {scanResult.trends.length}개 트렌드를 찾아 저장했습니다.
          </div>
        )}
      </div>

      <div className="space-y-3">
        {trends.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 조사된 트렌드가 없습니다. SCAN NOW를 눌러 시작하세요.</p>
        ) : (
          trends.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{t.name}</h3>
                    <span className={`badge ${STAGE_COLOR[t.stage] || 'bg-neutral-200'}`}>{t.stage || 'UNKNOWN'}</span>
                    <span className="badge bg-neutral-100 text-neutral-600">{t.platform}</span>
                    <span className="badge bg-neutral-100 text-neutral-500">status: {t.status}</span>
                  </div>
                  <p className="text-sm text-neutral-600 mt-2">{t.momentum}</p>
                  {t.raw_json?.rationale && <p className="text-sm text-neutral-500 mt-1">{t.raw_json.rationale}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-400">Opportunity</p>
                  <p className="text-xl font-bold text-accent">{t.opportunity_score ?? '-'}</p>
                  <p className="text-xs text-neutral-400 mt-1">Channel Fit</p>
                  <p className="text-lg font-semibold">{t.channel_fit_score ?? '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-neutral-500">
                <div>Evidence: {t.evidence_confidence}</div>
                <div>Competition: {t.competition}</div>
                <div>Risk: {t.risk || 'UNKNOWN'}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-1 text-xs text-neutral-500">
                <div>Higgsfield Fit: {t.higgsfield_fit}/5</div>
                <div>Originality: {t.originality_potential}/5</div>
                <div>Series Potential: {t.series_potential}/5</div>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="btn-secondary text-xs" onClick={() => router.push(`/concepts?trendId=${t.id}`)}>
                  GENERATE CONCEPTS →
                </button>
                <button className="btn-ghost text-xs" onClick={() => setStatus(t.id, t.status === 'shortlisted' ? 'discovered' : 'shortlisted')}>
                  {t.status === 'shortlisted' ? 'UNSHORTLIST' : 'SHORTLIST'}
                </button>
                <button className="btn-ghost text-xs" onClick={() => setStatus(t.id, 'archived')}>
                  ARCHIVE
                </button>
                <button className="btn-ghost text-xs text-red-600" onClick={() => handleDelete(t.id)}>
                  DELETE
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
