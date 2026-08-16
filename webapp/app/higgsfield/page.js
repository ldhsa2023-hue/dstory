'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CopyButton from '../../components/CopyButton';

const MODEL_CHEATSHEET = [
  { id: 'seedance_2_0', label: 'Seedance 2.0', when: '캐릭터/제품 일관성 + 이미지·영상·오디오 레퍼런스 결합' },
  { id: 'seedance_2_0_mini', label: 'Seedance 2.0 Mini', when: '위와 동일 + 예산/속도 우선(480~720p)' },
  { id: 'kling3_0', label: 'Kling v3.0', when: '멀티샷 시네마틱 + 오디오 싱크 + 모션 트랜스퍼' },
  { id: 'minimax_h3', label: 'MiniMax H3', when: '2K 키프레임 + 복합 레퍼런스' },
];

function HiggsfieldInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sceneId = searchParams.get('sceneId');

  const [scenes, setScenes] = useState([]);
  const [scene, setScene] = useState(null);
  const [saved, setSaved] = useState([]);
  const [opts, setOpts] = useState({
    styleLock: '',
    needsCharacterConsistency: true,
    needsMultiShotCinematic: false,
    needs2K: false,
    budgetPriority: false,
    characterMediaId: '',
    trendSummary: '',
    reinterpretation: '',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/scenes').then((r) => r.json()).then(setScenes);
    fetch('/api/higgsfield').then((r) => r.json()).then(setSaved);
  }, []);

  useEffect(() => {
    if (!sceneId || scenes.length === 0) return;
    const s = scenes.find((x) => x.id === sceneId);
    if (s) setScene(s);
  }, [sceneId, scenes]);

  async function handleGenerate() {
    if (!scene) return;
    setLoading(true);
    try {
      const res = await fetch('/api/higgsfield/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shots: scene.shots,
          format: scene.format,
          characterRef: scene.characterRef,
          ...opts,
        }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch('/api/higgsfield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_id: scene?.id || null,
          title: scene?.title || '제목 없음',
          request: result.request,
          guide: result.guide,
        }),
      });
      const item = await res.json();
      setSaved((prev) => [item, ...prev]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">3. Higgsfield 프롬프트·가이드 생성</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          2단계에서 저장한 샷 리스트를 Higgsfield에 바로 제출 가능한 요청(model/prompt/aspect_ratio/duration/medias)과
          사용 가이드로 변환합니다.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">2단계에서 저장한 씬 선택</label>
          <select
            className="input"
            value={sceneId || ''}
            onChange={(e) => router.push(e.target.value ? `/higgsfield?sceneId=${e.target.value}` : '/higgsfield')}
          >
            <option value="">씬을 선택하세요</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.shots.length}샷)
              </option>
            ))}
          </select>
        </div>

        {scene && (
          <>
            <div className="text-sm text-neutral-500">
              포맷: {scene.format === 'longform' ? 'Long-form (16:9)' : 'Shorts (9:16)'} · 캐릭터: {scene.characterRef || '없음'}
            </div>

            <div>
              <label className="label">아트 스타일 고정값 (모든 샷에 공통 적용)</label>
              <input
                className="input"
                value={opts.styleLock}
                onChange={(e) => setOpts({ ...opts, styleLock: e.target.value })}
                placeholder="예: painterly fantasy illustration, consistent cinematic lighting, 8k detail"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">캐릭터 레퍼런스 media_id (선택)</label>
                <input
                  className="input"
                  value={opts.characterMediaId}
                  onChange={(e) => setOpts({ ...opts, characterMediaId: e.target.value })}
                  placeholder="Higgsfield에 업로드한 캐릭터 이미지의 media_id"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-5">
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={opts.needsCharacterConsistency}
                    onChange={(e) => setOpts({ ...opts, needsCharacterConsistency: e.target.checked })}
                  />
                  캐릭터 일관성 필요
                </label>
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={opts.needsMultiShotCinematic}
                    onChange={(e) => setOpts({ ...opts, needsMultiShotCinematic: e.target.checked })}
                  />
                  멀티샷 시네마틱/오디오
                </label>
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={opts.needs2K}
                    onChange={(e) => setOpts({ ...opts, needs2K: e.target.checked })}
                  />
                  2K 키프레임
                </label>
                <label className="text-sm flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={opts.budgetPriority}
                    onChange={(e) => setOpts({ ...opts, budgetPriority: e.target.checked })}
                  />
                  예산/속도 우선
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">트렌드 요약 (GPT 마스터 프롬프트용, 선택)</label>
                <input
                  className="input"
                  value={opts.trendSummary}
                  onChange={(e) => setOpts({ ...opts, trendSummary: e.target.value })}
                />
              </div>
              <div>
                <label className="label">재해석안 (GPT 마스터 프롬프트용, 선택)</label>
                <input
                  className="input"
                  value={opts.reinterpretation}
                  onChange={(e) => setOpts({ ...opts, reinterpretation: e.target.value })}
                />
              </div>
            </div>

            <button className="btn-secondary" onClick={handleGenerate} disabled={loading}>
              {loading ? '생성 중...' : 'Higgsfield 요청 생성'}
            </button>
          </>
        )}
      </div>

      {result && (
        <>
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Higgsfield 요청 JSON (샷별)</h2>
              <CopyButton text={JSON.stringify(result.request, null, 2)} label="전체 JSON 복사" />
            </div>
            <div className="space-y-3">
              {result.request.map((shot) => (
                <div key={shot.shot_number} className="border border-neutral-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge bg-neutral-900 text-white">샷 {shot.shot_number}</span>
                    <span className="text-xs text-neutral-400">
                      {shot.model} · {shot.aspect_ratio} · {shot.duration}초
                    </span>
                  </div>
                  <p className="text-sm">{shot.prompt}</p>
                  {shot.notes && <p className="text-xs text-neutral-400 mt-1">{shot.notes}</p>}
                  {shot.medias?.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-1">medias: {JSON.stringify(shot.medias)}</p>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '이 요청 저장하기'}
            </button>
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="font-semibold">사용 가이드</h2>
            <ol className="list-decimal list-inside text-sm space-y-1 text-neutral-700">
              {result.guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">이번 요청에 사용된 모델</p>
              <div className="flex flex-wrap gap-2">
                {result.guide.models.map((m) => {
                  const info = MODEL_CHEATSHEET.find((c) => c.id === m);
                  return (
                    <span key={m} className="badge bg-neutral-100 text-neutral-700" title={info?.when}>
                      {info?.label || m}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">GPT 마스터 프롬프트 (다른 샷 구성을 GPT에 다시 요청하고 싶을 때)</h2>
              <CopyButton text={result.masterPrompt} />
            </div>
            <pre className="codebox">{result.masterPrompt}</pre>
          </div>
        </>
      )}

      <div className="card p-5">
        <h2 className="font-semibold mb-3">모델 선택 치트시트</h2>
        <table className="w-full text-sm">
          <tbody>
            {MODEL_CHEATSHEET.map((m) => (
              <tr key={m.id} className="border-t border-neutral-100">
                <td className="py-2 pr-4 font-medium whitespace-nowrap">{m.label}</td>
                <td className="py-2 text-neutral-500">{m.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">저장된 Higgsfield 요청 ({saved.length})</h2>
        {saved.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 저장된 요청이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {saved.map((r) => (
              <li key={r.id} className="py-2">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-neutral-400">
                  샷 {r.request.length}개 · {new Date(r.created_at).toLocaleString('ko-KR')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function HiggsfieldPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">불러오는 중...</p>}>
      <HiggsfieldInner />
    </Suspense>
  );
}
