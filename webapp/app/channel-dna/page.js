'use client';

import { useEffect, useState } from 'react';
import CopyButton from '../../components/CopyButton';

export default function ChannelDnaPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/channel-dna')
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-sm text-neutral-400">불러오는 중...</p>;
  const { dna, formatFatigue, promptLibrary, providerPerformance } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CHANNEL DNA</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          실제 게시 성과 데이터가 쌓였을 때만 계산됩니다. 데이터가 부족하면 추측하지 않고 정직하게 알려드립니다.
        </p>
      </div>

      <div className="card p-5">
        {!dna.sufficient ? (
          <div className="text-center py-6">
            <p className="text-lg font-semibold text-neutral-700">데이터 부족</p>
            <p className="text-sm text-neutral-500 mt-2">
              성과가 입력된 Production {dna.count}개 / 최소 {dna.threshold}개 필요.
            </p>
            <p className="text-xs text-neutral-400 mt-2">
              각 Production의 PERFORMANCE 탭에서 실제 YouTube/Instagram 수치를 입력하면 이 페이지에 실제 데이터 기반
              분석이 표시됩니다. 이 임계값(3)은 통계적 유의성 검정이 아니라 &quot;비교가 의미 있으려면 이 정도는
              있어야 한다&quot;는 투명한 기준입니다.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">실제 성과 데이터 {dna.count}건 기준.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="label mb-2">BEST PERFORMING HOOK TYPE (조회수 기준)</p>
                {dna.bestByHookType.map((h) => (
                  <div key={h.key} className="flex justify-between text-sm border-b border-neutral-100 py-1">
                    <span>{h.key}</span>
                    <span className="text-neutral-400">
                      평균 {h.avg}회 ({h.count}건)
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <p className="label mb-2">BEST PERFORMING GENRE (조회수 기준)</p>
                {dna.bestByGenre.map((g) => (
                  <div key={g.key} className="flex justify-between text-sm border-b border-neutral-100 py-1">
                    <span>{g.key}</span>
                    <span className="text-neutral-400">
                      평균 {g.avg}회 ({g.count}건)
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <p className="label mb-2">RETENTION DRIVER — Hook Type (평균 % Viewed)</p>
                {dna.retentionByHookType.map((h) => (
                  <div key={h.key} className="flex justify-between text-sm border-b border-neutral-100 py-1">
                    <span>{h.key}</span>
                    <span className="text-neutral-400">{h.avg}%</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="label mb-2">RETENTION DRIVER — Music Energy</p>
                {dna.bestByMusicEnergy.map((m) => (
                  <div key={m.key} className="flex justify-between text-sm border-b border-neutral-100 py-1">
                    <span>{m.key}</span>
                    <span className="text-neutral-400">{m.avg}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-2">TOP PERFORMERS</p>
              {dna.topPerformers.map((p) => (
                <div key={p.production_id} className="text-sm border-b border-neutral-100 py-1 flex justify-between">
                  <span>{p.title}</span>
                  <span className="text-neutral-400">{p.views}회</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <p className="label mb-2">PROVIDER PERFORMANCE</p>
        {(!providerPerformance || providerPerformance.providers.length === 0) ? (
          <p className="text-sm text-neutral-400">
            아직 기록이 없습니다. ASSETS 탭에서 클립의 Generation Outcome을 기록할 때 Provider를 함께 선택하면 여기 표시됩니다.
          </p>
        ) : (
          <div className="space-y-2">
            {providerPerformance.providers.map((p) => (
              <div key={p.provider} className="border border-neutral-100 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{p.provider}</span>
                  {p.sufficient ? (
                    <span className="text-sm text-neutral-500">
                      성공률 {p.successRate}% ({p.successCount}/{p.count})
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">
                      데이터 부족 ({p.count}/{p.threshold}건)
                    </span>
                  )}
                </div>
                {p.sufficient && (
                  <p className="text-xs text-neutral-400 mt-1">
                    SUCCESS {p.successCount} · RETAKE {p.retakeCount} · FAIL {p.failCount}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <p className="label mb-2">FORMAT FATIGUE ({formatFatigue.checked}개 최근 Production 검토)</p>
        {formatFatigue.warnings.length === 0 ? (
          <p className="text-sm text-neutral-400">반복 패턴이 감지되지 않았습니다.</p>
        ) : (
          <ul className="space-y-1">
            {formatFatigue.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                ⚠ FORMAT FATIGUE — {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <p className="label mb-2">PROMPT LIBRARY ({promptLibrary.length}개 — SUCCESS로 기록된 클립의 실제 프롬프트)</p>
        {promptLibrary.length === 0 ? (
          <p className="text-sm text-neutral-400">
            아직 없습니다. ASSETS 탭에서 클립의 Generation Outcome을 SUCCESS로 기록하면 여기 모입니다.
          </p>
        ) : (
          <div className="space-y-2">
            {promptLibrary.map((e, i) => (
              <div key={i} className="border border-neutral-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-400">
                    {e.production_id} · Scene {e.scene_number}
                  </span>
                  <CopyButton text={e.prompt} />
                </div>
                <p className="text-sm">{e.prompt}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
