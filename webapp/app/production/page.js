'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductionListPage() {
  const router = useRouter();
  const [productions, setProductions] = useState([]);

  useEffect(() => {
    fetch('/api/production').then((r) => r.json()).then(setProductions);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PRODUCTION</h1>
        <p className="text-neutral-500 mt-1 text-sm">Concept Lab에서 APPROVE한 프로젝트가 여기에 표시됩니다.</p>
      </div>

      {productions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-neutral-500">아직 승인된 Production이 없습니다.</p>
          <button className="btn-primary mt-4" onClick={() => router.push('/concepts')}>
            CONCEPT LAB으로 이동
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {productions.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/production/${p.id}`)}
              className="card p-5 text-left hover:border-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{p.title}</h3>
                <span className="badge bg-neutral-100 text-neutral-600">{p.status}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                {p.format} · {p.target_duration}초 · {new Date(p.created_at).toLocaleString('ko-KR')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
