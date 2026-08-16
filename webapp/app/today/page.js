'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const BET_ICON = { 'PRIMARY BET': '🥇', 'GROWTH BET': '🥈', 'EXPERIMENT BET': '🥉' };

function combinedScore(t) {
  return (Number(t.opportunity_score) || 0) * 0.5 + (Number(t.channel_fit_score) || 0) * 0.5;
}

export default function TodayPage() {
  const router = useRouter();
  const [top3, setTop3] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trends')
      .then((r) => r.json())
      .then((trends) => {
        const eligible = trends.filter((t) => t.status !== 'archived');
        const ranked = [...eligible].sort((a, b) => combinedScore(b) - combinedScore(a)).slice(0, 3);
        const labels = ['PRIMARY BET', 'GROWTH BET', 'EXPERIMENT BET'];
        setTop3(ranked.map((t, i) => ({ ...t, betLabel: labels[i] })));
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">TODAY&apos;S 3 BETS</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Trend Radar에 저장된 트렌드 중 Opportunity Score와 Channel Fit Score를 절반씩 반영해 상위 3개를 고릅니다.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">불러오는 중...</p>
      ) : top3.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-neutral-500">아직 트렌드가 없습니다.</p>
          <button className="btn-primary mt-4" onClick={() => router.push('/trends')}>
            TREND RADAR로 이동
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {top3.map((t) => (
            <div key={t.id} className="card p-5 flex flex-col">
              <p className="text-xs font-semibold text-neutral-400">
                {BET_ICON[t.betLabel]} {t.betLabel}
              </p>
              <h3 className="font-bold text-lg mt-1">{t.name}</h3>
              <p className="text-sm text-neutral-500 mt-2 flex-1">{t.momentum}</p>
              {t.raw_json?.rationale && <p className="text-xs text-neutral-400 mt-2">{t.raw_json.rationale}</p>}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="bg-neutral-50 rounded-lg p-2 text-center">
                  <p className="text-neutral-400">Opportunity</p>
                  <p className="font-bold text-accent">{t.opportunity_score ?? '-'}</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2 text-center">
                  <p className="text-neutral-400">Channel Fit</p>
                  <p className="font-bold">{t.channel_fit_score ?? '-'}</p>
                </div>
              </div>
              <button className="btn-primary mt-4" onClick={() => router.push(`/concepts?trendId=${t.id}`)}>
                APPROVE → GENERATE CONCEPTS
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
