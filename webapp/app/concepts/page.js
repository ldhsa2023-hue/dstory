'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const FILTERS = [
  { key: 'viral', label: 'MOST VIRAL' },
  { key: 'originality', label: 'MOST ORIGINAL' },
  { key: 'production_ease', label: 'EASIEST TO PRODUCE' },
  { key: 'higgsfield_fit', label: 'BEST FOR HIGGSFIELD' },
  { key: 'series_fit', label: 'BEST FOR SERIES' },
  { key: 'global_fit', label: 'BEST FOR GLOBAL' },
  { key: 'subscriber_fit', label: 'BEST FOR SUBSCRIBERS' },
  { key: 'watchtime_fit', label: 'BEST FOR WATCH TIME' },
];

function ConceptLabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trendId = searchParams.get('trendId');

  const [trend, setTrend] = useState(null);
  const [concepts, setConcepts] = useState([]);
  const [sortBy, setSortBy] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    if (trendId) {
      fetch('/api/trends')
        .then((r) => r.json())
        .then((all) => setTrend(all.find((t) => t.id === trendId) || null));
      refreshConcepts(trendId);
    } else {
      refreshConcepts(null);
    }
  }, [trendId]);

  function refreshConcepts(tId) {
    const url = tId ? `/api/concepts?trendId=${tId}` : '/api/concepts';
    fetch(url).then((r) => r.json()).then(setConcepts);
  }

  async function handleGenerate() {
    if (!trendId) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch('/api/concepts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trendId }),
      });
      const data = await res.json();
      setGenResult(data);
      refreshConcepts(trendId);
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(conceptId) {
    setApprovingId(conceptId);
    try {
      const res = await fetch('/api/concepts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId }),
      });
      const production = await res.json();
      router.push(`/production/${production.id}`);
    } finally {
      setApprovingId(null);
    }
  }

  const sorted = sortBy
    ? [...concepts].sort((a, b) => (b.raw_json?.scores?.[sortBy] || 0) - (a.raw_json?.scores?.[sortBy] || 0))
    : concepts;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">CONCEPT LAB</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Originality Guard: 각 컨셉은 원본 트렌드 대비 최소 4개 요소(Subject/Character/World/Story/Conflict/Visual/Payoff/Ending)를
          바꿔서 생성됩니다.
        </p>
      </div>

      {trend ? (
        <div className="card p-5">
          <p className="text-xs text-neutral-400">선택된 트렌드</p>
          <h2 className="font-semibold mt-1">{trend.name}</h2>
          <p className="text-sm text-neutral-500 mt-1">{trend.momentum}</p>
          <button className="btn-secondary mt-4" onClick={handleGenerate} disabled={generating}>
            {generating ? 'GENERATING... (최대 ~2분)' : 'GENERATE CONCEPTS'}
          </button>
          {genResult?.mode === 'template' && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
              Claude CLI 미감지 — 아래 프롬프트를 직접 실행하세요.
              <pre className="codebox mt-2">{genResult.prompt}</pre>
            </div>
          )}
          {genResult?.mode === 'error' && (
            <p className="text-sm text-red-600 mt-3">오류: {genResult.error}</p>
          )}
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm text-neutral-500">
            Trend Radar에서 트렌드를 선택해 &quot;GENERATE CONCEPTS&quot;를 눌러야 새 컨셉이 생성됩니다. 아래는 지금까지 생성된 전체 컨셉
            목록입니다.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className={`px-3 py-1 rounded-full text-xs font-semibold border ${!sortBy ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 text-neutral-600'}`}
          onClick={() => setSortBy(null)}
        >
          최신순
        </button>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${sortBy === f.key ? 'bg-accent text-white border-accent' : 'border-neutral-300 text-neutral-600'}`}
            onClick={() => setSortBy(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 생성된 컨셉이 없습니다.</p>
        ) : (
          sorted.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{c.title}</h3>
                <span className="badge bg-neutral-100 text-neutral-600">{c.status}</span>
              </div>
              <p className="text-sm text-neutral-600 mt-2">{c.logline}</p>
              <p className="text-xs text-neutral-400 mt-1">{c.why_now}</p>
              {c.differentiation?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.differentiation.map((d) => (
                    <span key={d} className="badge bg-accent2/10 text-accent2 text-[10px]">
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {c.raw_json?.scores && (
                <div className="grid grid-cols-4 gap-1 mt-3 text-[10px] text-neutral-500">
                  {Object.entries(c.raw_json.scores).map(([k, v]) => (
                    <div key={k} className="bg-neutral-50 rounded p-1 text-center">
                      {k}: {v}
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn-primary mt-4 text-xs"
                onClick={() => handleApprove(c.id)}
                disabled={approvingId === c.id || c.status === 'approved'}
              >
                {c.status === 'approved' ? 'APPROVED' : approvingId === c.id ? '승인 중...' : 'APPROVE → PRODUCTION'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ConceptLabPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">불러오는 중...</p>}>
      <ConceptLabInner />
    </Suspense>
  );
}
