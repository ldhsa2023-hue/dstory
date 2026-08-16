'use client';

import { useEffect, useState } from 'react';
import CopyButton from '../../../components/CopyButton';

const TABS = ['OVERVIEW', 'HOOK', 'PROMPTS'];
const HIGGSFIELD_MODES = ['STABLE', 'CINEMATIC', 'VIRAL'];

export default function ProductionWorkspacePage({ params }) {
  const { id } = params;
  const [tab, setTab] = useState('OVERVIEW');
  const [bundle, setBundle] = useState(null);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [hookGenResult, setHookGenResult] = useState(null);
  const [selectingHookId, setSelectingHookId] = useState(null);
  const [higgsfieldMode, setHiggsfieldMode] = useState('CINEMATIC');
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [promptGenResult, setPromptGenResult] = useState(null);

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    fetch(`/api/production/${id}`)
      .then((r) => r.json())
      .then(setBundle);
  }

  async function handleGenerateHooks() {
    setGeneratingHooks(true);
    setHookGenResult(null);
    try {
      const res = await fetch('/api/production/hooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionId: id }),
      });
      const data = await res.json();
      setHookGenResult(data);
      refresh();
    } finally {
      setGeneratingHooks(false);
    }
  }

  async function handleSelectHook(hookId) {
    setSelectingHookId(hookId);
    try {
      await fetch(`/api/production/${id}/select-hook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hookId }),
      });
      refresh();
    } finally {
      setSelectingHookId(null);
    }
  }

  async function handleGeneratePrompts() {
    setGeneratingPrompts(true);
    setPromptGenResult(null);
    try {
      const res = await fetch('/api/production/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionId: id, higgsfieldMode }),
      });
      const data = await res.json();
      setPromptGenResult(data);
      refresh();
    } finally {
      setGeneratingPrompts(false);
    }
  }

  if (!bundle) return <p className="text-sm text-neutral-400">불러오는 중...</p>;
  const { production, concept, hooks, promptPack } = bundle;
  if (!production) return <p className="text-sm text-red-500">Production을 찾을 수 없습니다.</p>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{production.title}</h1>
          <span className="badge bg-neutral-100 text-neutral-600">{production.status}</span>
        </div>
        <p className="text-neutral-500 mt-1 text-sm">{concept?.logline}</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-neutral-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'OVERVIEW' && (
        <div className="space-y-4">
          <div className="card p-5 grid md:grid-cols-2 gap-4">
            <div>
              <p className="label">Concept</p>
              <p className="text-sm">{concept?.title}</p>
              <p className="text-xs text-neutral-400 mt-1">{concept?.why_now}</p>
            </div>
            <div>
              <p className="label">Format</p>
              <p className="text-sm">
                {production.format} · {production.target_duration}초
              </p>
            </div>
          </div>
          <div className="card p-5">
            <p className="label mb-2">Storyboard</p>
            {production.storyboard?.length > 0 ? (
              <ul className="space-y-2">
                {production.storyboard.map((s) => (
                  <li key={s.scene_number} className="text-sm border-b border-neutral-100 pb-2">
                    <span className="font-semibold">Scene {s.scene_number}</span> ({s.duration_sec}s) — {s.purpose}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">PROMPTS 탭에서 Prompt Pack을 생성하면 Storyboard가 채워집니다.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'HOOK' && (
        <div className="space-y-4">
          <div className="card p-5">
            <button className="btn-secondary" onClick={handleGenerateHooks} disabled={generatingHooks}>
              {generatingHooks ? 'GENERATING HOOKS...' : 'GENERATE HOOKS (10+)'}
            </button>
            {hookGenResult?.mode === 'template' && (
              <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                Claude CLI 미감지 — 프롬프트를 직접 실행하세요.
                <pre className="codebox mt-2">{hookGenResult.prompt}</pre>
              </div>
            )}
            {hookGenResult?.mode === 'error' && <p className="text-sm text-red-600 mt-3">오류: {hookGenResult.error}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {hooks?.map((h) => (
              <div key={h.id} className={`card p-4 ${h.selected ? 'border-accent ring-1 ring-accent' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="badge bg-neutral-900 text-white">{h.type}</span>
                  {h.selected && <span className="badge bg-accent text-white">SELECTED</span>}
                </div>
                {h.hook_text && <p className="text-sm font-semibold mt-2">&quot;{h.hook_text}&quot;</p>}
                {h.narration && <p className="text-xs text-neutral-500 mt-1">{h.narration}</p>}
                <div className="grid grid-cols-4 gap-1 mt-2 text-[10px] text-neutral-500">
                  {Object.entries(h.scores || {}).map(([k, v]) => (
                    <div key={k} className="bg-neutral-50 rounded p-1 text-center">
                      {k.replace(/_/g, ' ')}: {v}
                    </div>
                  ))}
                </div>
                <button
                  className="btn-ghost text-xs mt-3"
                  onClick={() => handleSelectHook(h.id)}
                  disabled={selectingHookId === h.id || h.selected}
                >
                  {h.selected ? 'SELECTED' : selectingHookId === h.id ? '선택 중...' : 'SELECT THIS HOOK'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'PROMPTS' && (
        <div className="space-y-4">
          {!production.hook_id && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
              먼저 HOOK 탭에서 Hook을 선택하세요. Hook 없이도 생성은 가능하지만 품질이 떨어집니다.
            </div>
          )}
          <div className="card p-5 space-y-3">
            <div className="flex gap-2">
              {HIGGSFIELD_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setHiggsfieldMode(m)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    higgsfieldMode === m ? 'bg-accent text-white border-accent' : 'border-neutral-300 text-neutral-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={handleGeneratePrompts} disabled={generatingPrompts}>
              {generatingPrompts ? 'GENERATING PROMPT PACK...' : 'GENERATE CHATGPT + HIGGSFIELD PROMPTS'}
            </button>
            {promptGenResult?.mode === 'template' && (
              <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                Claude CLI 미감지 — 프롬프트를 직접 실행하세요.
                <pre className="codebox mt-2">{promptGenResult.prompt}</pre>
              </div>
            )}
            {promptGenResult?.mode === 'error' && <p className="text-sm text-red-600">오류: {promptGenResult.error}</p>}
          </div>

          {promptPack?.global_visual_lock && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">GLOBAL VISUAL LOCK</p>
                <CopyButton text={promptPack.global_visual_lock} />
              </div>
              <p className="text-sm mt-2">{promptPack.global_visual_lock}</p>
            </div>
          )}

          {promptPack?.image_prompts?.length > 0 && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label">CHATGPT IMAGE PROMPTS</p>
                <CopyButton
                  text={promptPack.image_prompts.map((p) => `Scene ${p.scene_number}: ${p.prompt}`).join('\n\n')}
                  label="COPY ALL"
                />
              </div>
              {promptPack.image_prompts.map((p) => (
                <div key={p.scene_number} className="border border-neutral-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge bg-neutral-900 text-white">Scene {p.scene_number}</span>
                    <CopyButton text={p.prompt} />
                  </div>
                  <p className="text-sm">{p.prompt}</p>
                </div>
              ))}
            </div>
          )}

          {promptPack?.higgsfield_prompts?.length > 0 && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="label">HIGGSFIELD VIDEO PROMPTS ({promptPack.higgsfield_mode})</p>
                <CopyButton
                  text={promptPack.higgsfield_prompts.map((p) => `Scene ${p.scene_number}: ${p.prompt}`).join('\n\n')}
                  label="COPY ALL"
                />
              </div>
              {promptPack.higgsfield_prompts.map((p) => (
                <div key={p.scene_number} className="border border-neutral-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="badge bg-neutral-900 text-white">
                      Scene {p.scene_number} · {p.duration_sec}s
                    </span>
                    <CopyButton text={p.prompt} />
                  </div>
                  <p className="text-sm">{p.prompt}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
