import Link from 'next/link';
import { listTrends, listProductions, listConcepts, getChannelProfile } from '../lib/db/repo';

const STATUS_GROUPS = ['APPROVED', 'PROMPTS READY', 'GENERATING', 'EDITING', 'READY TO PUBLISH', 'PUBLISHED'];

const WIZARD_STEPS = [
  { href: '/settings', label: 'SETTINGS', desc: '채널 프로필(이름/목표/니치)을 입력해 이후 모든 Claude 생성의 맥락으로 사용합니다' },
  { href: '/trends', label: 'TREND RADAR', desc: 'SCAN NOW로 실제 트렌드를 조사합니다 (Claude + WebSearch)' },
  { href: '/concepts', label: 'CONCEPT LAB', desc: '트렌드를 오리지널 컨셉으로 재해석하고 승인해 Production을 만듭니다' },
  { href: '/production', label: 'PRODUCTION', desc: 'Hook 선택 → Storyboard/프롬프트 생성 → Higgsfield/Google Flow에 붙여넣기' },
];

function combinedScore(t) {
  return (Number(t.opportunity_score) || 0) * 0.5 + (Number(t.channel_fit_score) || 0) * 0.5;
}

export default function DashboardPage() {
  const trends = listTrends();
  const productions = listProductions();
  const concepts = listConcepts();
  const channelProfile = getChannelProfile();
  const isFirstRun = !channelProfile?.channelName && concepts.length === 0 && productions.length === 0;
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

      {isFirstRun && (
        <div className="card p-5 border-accent/40 bg-accent/5 space-y-3">
          <p className="label">처음이신가요? — 4단계로 시작하기</p>
          <div className="grid md:grid-cols-4 gap-3">
            {WIZARD_STEPS.map((step, i) => (
              <Link key={step.href} href={step.href} className="border border-neutral-200 bg-white rounded-lg p-3 hover:border-accent transition-colors">
                <p className="text-xs text-neutral-400">STEP {i + 1}</p>
                <p className="font-semibold text-sm mt-1">{step.label}</p>
                <p className="text-xs text-neutral-500 mt-1">{step.desc}</p>
              </Link>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            채널 프로필을 입력하거나 첫 Concept/Production을 만들면 이 안내는 자동으로 사라집니다.
          </p>
        </div>
      )}

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

      <Link href="/channel-dna" className="card p-5 block hover:border-accent transition-colors">
        <h2 className="font-semibold mb-1">CHANNEL DNA</h2>
        <p className="text-sm text-neutral-400">
          실제 게시 성과와 Provider별 Generation Outcome이 쌓이면 Best Hook/Genre, Provider 성공률, Format Fatigue를
          계산합니다. 데이터가 부족하면 추측하지 않고 정직하게 알려줍니다.
        </p>
      </Link>

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
