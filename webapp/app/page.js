import Link from 'next/link';
import { listTrends, listProductions } from '../lib/db/repo';

const STATUS_GROUPS = ['APPROVED', 'PROMPTS READY', 'GENERATING', 'EDITING', 'READY TO PUBLISH', 'PUBLISHED'];

function combinedScore(t) {
  return (Number(t.opportunity_score) || 0) * 0.5 + (Number(t.channel_fit_score) || 0) * 0.5;
}

export default function DashboardPage() {
  const trends = listTrends();
  const productions = listProductions();
  const top3 = [...trends.filter((t) => t.status !== 'archived')].sort((a, b) => combinedScore(b) - combinedScore(a)).slice(0, 3);

  const queueCounts = STATUS_GROUPS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  productions.forEach((p) => {
    const key = (p.status || '').toUpperCase();
    if (queueCounts[key] !== undefined) queueCounts[key] += 1;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">VIRAL STUDIO — DASHBOARD</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Trend Intelligence → Concept → Production → Prompt Pack까지, 로컬에서 실행되는 AI 콘텐츠 제작 운영 시스템 (V3.1
          Phase 1).
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/today" className="card p-5 hover:border-accent transition-colors">
          <h2 className="font-semibold">TODAY</h2>
          <p className="text-sm text-neutral-500 mt-2">오늘의 3개 베팅 (Primary/Growth/Experiment)</p>
          <p className="text-xs font-semibold text-accent mt-4">
            {top3.length > 0 ? `${top3.length}개 준비됨` : '트렌드 없음'} →
          </p>
        </Link>
        <Link href="/trends" className="card p-5 hover:border-accent transition-colors">
          <h2 className="font-semibold">TREND RADAR</h2>
          <p className="text-sm text-neutral-500 mt-2">SCAN NOW로 실시간 트렌드 조사 (Claude + WebSearch)</p>
          <p className="text-xs font-semibold text-accent mt-4">{trends.length}건 기록 →</p>
        </Link>
        <Link href="/concepts" className="card p-5 hover:border-accent transition-colors">
          <h2 className="font-semibold">CONCEPT LAB</h2>
          <p className="text-sm text-neutral-500 mt-2">트렌드를 오리지널 컨셉으로 재해석</p>
          <p className="text-xs font-semibold text-accent mt-4">시작하기 →</p>
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">PRODUCTION QUEUE</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STATUS_GROUPS.map((s) => (
            <div key={s} className="bg-neutral-50 rounded-lg p-3 text-center">
              <p className="text-xs text-neutral-400">{s}</p>
              <p className="text-xl font-bold">{queueCounts[s]}</p>
            </div>
          ))}
        </div>
        {productions.length === 0 && <p className="text-sm text-neutral-400 mt-3">아직 Production이 없습니다.</p>}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">CHANNEL DNA</h2>
        <p className="text-sm text-neutral-400">
          아직 게시 성과 데이터가 없어 Channel DNA를 산출할 수 없습니다 (Phase 4에서 구현 예정). 실제 데이터가 쌓이기 전에는
          추측하지 않습니다.
        </p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">최근 트렌드</h2>
        {trends.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 기록된 트렌드가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {trends.slice(0, 5).map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-neutral-400">
                    {t.platform} · {t.stage} · {new Date(t.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <span className="badge bg-neutral-100 text-neutral-600 shrink-0">
                  Opp {t.opportunity_score ?? '-'} / Fit {t.channel_fit_score ?? '-'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
