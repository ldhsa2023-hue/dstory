import Link from 'next/link';
import { readCollection } from '../lib/db';
import { DECISION_LABEL } from '../lib/scoring';

export default function DashboardPage() {
  const trends = readCollection('trends');
  const ideas = readCollection('ideas');
  const scenes = readCollection('scenes');
  const higgsfieldRequests = readCollection('higgsfield_requests');

  const fastTrackCount = trends.filter((t) => t.decision === 'fast-track').length;

  const steps = [
    {
      href: '/trends',
      title: '1. 바이럴 영상 조사·분석·기획',
      desc: '트렌드를 기록하고 구조를 분석해, 우리 장르(판타지/음식/가족/비언어)로 재해석한다.',
      stat: `${trends.length}건 기록 · Fast-track ${fastTrackCount}건`,
    },
    {
      href: '/scenes',
      title: '2. 씬/삽화 생성용 GPT 프롬프트',
      desc: '재해석안을 샷 단위 대본으로 쪼개는 GPT 프롬프트를 만들고, 결과를 저장한다.',
      stat: `${scenes.length}건 저장`,
    },
    {
      href: '/higgsfield',
      title: '3. Higgsfield 프롬프트·가이드 생성',
      desc: '샷 리스트를 Higgsfield에 바로 제출 가능한 JSON 요청과 사용 가이드로 변환한다.',
      stat: `${higgsfieldRequests.length}건 생성`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI 유튜브 콘텐츠 기획 대시보드</h1>
        <p className="text-neutral-500 mt-1">
          트렌드 조사부터 Higgsfield 제작 요청까지 한 흐름으로 진행하세요. 데이터는 이 프로젝트의{' '}
          <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded">webapp/data/*.json</code> 파일에 로컬 저장됩니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {steps.map((s) => (
          <Link key={s.href} href={s.href} className="card p-5 hover:border-accent transition-colors block">
            <h2 className="font-semibold text-lg">{s.title}</h2>
            <p className="text-sm text-neutral-500 mt-2">{s.desc}</p>
            <p className="text-xs font-semibold text-accent mt-4">{s.stat} →</p>
          </Link>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">최근 기록된 트렌드</h2>
        {trends.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 기록된 트렌드가 없습니다. 1단계에서 시작하세요.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {trends.slice(0, 5).map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-neutral-400">{t.platform} · {new Date(t.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <span className={`badge shrink-0 ${DECISION_LABEL[t.decision]?.color || 'bg-neutral-200'}`}>
                  {DECISION_LABEL[t.decision]?.text || '미평가'} ({t.total ?? '-'}/25)
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
