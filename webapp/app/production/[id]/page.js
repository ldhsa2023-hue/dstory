'use client';

import { useEffect, useState } from 'react';
import CopyButton from '../../../components/CopyButton';

const TABS = ['OVERVIEW', 'HOOK', 'PROMPTS', 'ASSETS', 'AUDIO', 'CAPTIONS', 'EFFECTS', 'RENDER', 'PUBLISH'];
const HIGGSFIELD_MODES = ['STABLE', 'CINEMATIC', 'VIRAL'];
const EFFECT_BUDGETS = ['LOW', 'BALANCED', 'HIGH_ENERGY'];
const ASSET_TYPES = ['VIDEO_CLIP', 'MUSIC', 'SFX', 'VOICE', 'REFERENCE_IMAGE', 'GENERATED_IMAGE', 'THUMBNAIL', 'OTHER'];
const RENDER_PRESETS = ['PREVIEW', 'FINAL'];

function JobStatusBadge({ status }) {
  const color =
    status === 'COMPLETED'
      ? 'bg-accent2 text-white'
      : status === 'FAILED'
      ? 'bg-red-500 text-white'
      : 'bg-amber-200 text-amber-900';
  return <span className={`badge ${color}`}>{status}</span>;
}

function GenPanel({ label, onClick, loading, result }) {
  return (
    <div className="card p-5 space-y-3">
      <button className="btn-secondary" onClick={onClick} disabled={loading}>
        {loading ? 'GENERATING...' : label}
      </button>
      {result?.mode === 'template' && (
        <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
          Claude CLI 미감지 — 아래 프롬프트를 직접 실행한 뒤 결과를 참고해 수동으로 입력하세요.
          <pre className="codebox mt-2">{result.prompt}</pre>
        </div>
      )}
      {result?.mode === 'error' && <p className="text-sm text-red-600">오류: {result.error}</p>}
    </div>
  );
}

function PassBadge({ value }) {
  const color =
    value === 'PASS' ? 'bg-accent2 text-white' : value === 'BLOCK' ? 'bg-red-500 text-white' : 'bg-amber-200 text-amber-900';
  return <span className={`badge ${color}`}>{value || 'UNKNOWN'}</span>;
}

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

  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioGenResult, setAudioGenResult] = useState(null);

  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captionGenResult, setCaptionGenResult] = useState(null);

  const [effectBudget, setEffectBudget] = useState('BALANCED');
  const [generatingEffects, setGeneratingEffects] = useState(false);
  const [effectGenResult, setEffectGenResult] = useState(null);

  const [generatingPublish, setGeneratingPublish] = useState(false);
  const [publishGenResult, setPublishGenResult] = useState(null);
  const [approving, setApproving] = useState(false);

  const [uploadType, setUploadType] = useState('VIDEO_CLIP');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [renderPreset, setRenderPreset] = useState('PREVIEW');
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    refresh();
  }, [id]);

  function refresh() {
    fetch(`/api/production/${id}`)
      .then((r) => r.json())
      .then(setBundle);
  }

  async function post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function handleGenerateHooks() {
    setGeneratingHooks(true);
    setHookGenResult(null);
    try {
      setHookGenResult(await post('/api/production/hooks/generate', { productionId: id }));
      refresh();
    } finally {
      setGeneratingHooks(false);
    }
  }

  async function handleSelectHook(hookId) {
    setSelectingHookId(hookId);
    try {
      await post(`/api/production/${id}/select-hook`, { hookId });
      refresh();
    } finally {
      setSelectingHookId(null);
    }
  }

  async function handleGeneratePrompts() {
    setGeneratingPrompts(true);
    setPromptGenResult(null);
    try {
      setPromptGenResult(await post('/api/production/prompts/generate', { productionId: id, higgsfieldMode }));
      refresh();
    } finally {
      setGeneratingPrompts(false);
    }
  }

  async function handleGenerateAudio() {
    setGeneratingAudio(true);
    setAudioGenResult(null);
    try {
      setAudioGenResult(await post('/api/production/audio/generate', { productionId: id }));
      refresh();
    } finally {
      setGeneratingAudio(false);
    }
  }

  async function handleGenerateCaptions() {
    setGeneratingCaptions(true);
    setCaptionGenResult(null);
    try {
      setCaptionGenResult(await post('/api/production/captions/generate', { productionId: id }));
      refresh();
    } finally {
      setGeneratingCaptions(false);
    }
  }

  async function handleGenerateEffects() {
    setGeneratingEffects(true);
    setEffectGenResult(null);
    try {
      setEffectGenResult(await post('/api/production/effects/generate', { productionId: id, budget: effectBudget }));
      refresh();
    } finally {
      setGeneratingEffects(false);
    }
  }

  async function handleGeneratePublish() {
    setGeneratingPublish(true);
    setPublishGenResult(null);
    try {
      setPublishGenResult(await post('/api/production/publish/generate', { productionId: id }));
      refresh();
    } finally {
      setGeneratingPublish(false);
    }
  }

  async function handleApprovePublish() {
    setApproving(true);
    try {
      await post('/api/production/publish/approve', { productionId: id });
      refresh();
    } finally {
      setApproving(false);
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('productionId', id);
        form.append('type', uploadType);
        form.append('file', file);
        const res = await fetch('/api/production/assets', { method: 'POST', body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setUploadError(data.error || `업로드 실패 (${res.status})`);
          break;
        }
      }
      refresh();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleLinkScene(assetId, sceneNumber) {
    await fetch(`/api/production/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene_number: sceneNumber === '' ? null : Number(sceneNumber) }),
    });
    refresh();
  }

  async function handleDeleteAsset(assetId) {
    await fetch(`/api/production/assets/${assetId}`, { method: 'DELETE' });
    refresh();
  }

  async function handleRender() {
    setRendering(true);
    setRenderError(null);
    try {
      const res = await fetch('/api/production/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionId: id, preset: renderPreset }),
      });
      const data = await res.json();
      if (!res.ok) setRenderError(data.error || '렌더 요청 실패');
      refresh();
    } finally {
      setRendering(false);
    }
  }

  if (!bundle) return <p className="text-sm text-neutral-400">불러오는 중...</p>;
  const { production, concept, hooks, promptPack, audioPlan, captionTrack, effectTrack, publishPack, assets, renderJobs } =
    bundle;
  if (!production) return <p className="text-sm text-red-500">Production을 찾을 수 없습니다.</p>;
  const latestJob = renderJobs?.[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{production.title}</h1>
          <span className="badge bg-neutral-100 text-neutral-600">{production.status}</span>
        </div>
        <p className="text-neutral-500 mt-1 text-sm">{concept?.logline}</p>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${
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

      {tab === 'ASSETS' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <p className="label">업로드 (Higgsfield 영상 클립 / 음악 / 이미지)</p>
            <div className="flex flex-wrap gap-2 items-center">
              <select className="input w-auto" value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4,audio/aac,image/png,image/jpeg,image/webp"
                onChange={handleUpload}
                disabled={uploading}
                className="text-sm"
              />
              {uploading && <span className="text-xs text-neutral-400">업로드 중...</span>}
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <p className="text-xs text-neutral-400">
              허용 형식: mp4/mov/webm(영상), mp3/wav/m4a/aac(오디오), png/jpg/webp(이미지). 업로드된 파일은 원본 그대로{' '}
              <code>data/assets/original/</code>에 저장되며 이 프로젝트가 직접 수정하지 않습니다.
            </p>
          </div>

          <div className="card p-5">
            <p className="label mb-3">에셋 목록 ({assets?.length || 0})</p>
            {(!assets || assets.length === 0) && <p className="text-sm text-neutral-400">아직 업로드된 에셋이 없습니다.</p>}
            <div className="space-y-2">
              {assets?.map((a) => (
                <div key={a.id} className="border border-neutral-100 rounded-lg p-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="badge bg-neutral-900 text-white shrink-0">{a.type}</span>
                  <span className="truncate max-w-[220px]">{a.original_filename || a.id}</span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {a.duration_sec ? `${a.duration_sec.toFixed(1)}s` : ''} {a.width ? `· ${a.width}x${a.height}` : ''}
                  </span>
                  {a.type === 'VIDEO_CLIP' && (
                    <select
                      className="input w-auto ml-auto"
                      value={a.linked_scene_number ?? ''}
                      onChange={(e) => handleLinkScene(a.id, e.target.value)}
                    >
                      <option value="">Scene 연결 안 함</option>
                      {(production.storyboard || []).map((s) => (
                        <option key={s.scene_number} value={s.scene_number}>
                          Scene {s.scene_number}
                        </option>
                      ))}
                    </select>
                  )}
                  <button className="btn-ghost text-xs text-red-600 shrink-0" onClick={() => handleDeleteAsset(a.id)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'AUDIO' && (
        <div className="space-y-4">
          <GenPanel label="GENERATE AUDIO PLAN" onClick={handleGenerateAudio} loading={generatingAudio} result={audioGenResult} />

          {audioPlan?.blueprint && Object.keys(audioPlan.blueprint).length > 0 && (
            <div className="card p-5 space-y-2">
              <p className="label">MUSIC BLUEPRINT</p>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-neutral-400 text-xs">Purpose</span>
                  <p>{audioPlan.blueprint.purpose}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">Mood / Genre</span>
                  <p>
                    {audioPlan.blueprint.mood} / {audioPlan.blueprint.genre}
                  </p>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">Energy / Tempo / BPM</span>
                  <p>
                    {audioPlan.blueprint.energy} / {audioPlan.blueprint.tempo} / {audioPlan.blueprint.bpm_range}
                  </p>
                </div>
              </div>
              {audioPlan.blueprint.structure && (
                <div className="grid grid-cols-5 gap-2 mt-2 text-xs">
                  {Object.entries(audioPlan.blueprint.structure).map(([k, v]) => (
                    <div key={k} className="bg-neutral-50 rounded p-2">
                      <p className="font-semibold uppercase">{k}</p>
                      <p className="text-neutral-500">{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {audioPlan?.music_prompt && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">MUSIC MASTER PROMPT (외부 음악 생성 AI용)</p>
                <CopyButton text={audioPlan.music_prompt} />
              </div>
              <p className="text-sm mt-2">{audioPlan.music_prompt}</p>
            </div>
          )}

          {audioPlan?.music_timeline?.length > 0 && (
            <div className="card p-5">
              <p className="label mb-2">MUSIC TIMELINE</p>
              <ul className="text-sm space-y-1">
                {audioPlan.music_timeline.map((m, i) => (
                  <li key={i} className="flex justify-between border-b border-neutral-100 py-1">
                    <span>
                      {m.start_sec}s–{m.end_sec}s
                    </span>
                    <span className="text-neutral-500">{m.section}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {audioPlan?.sfx_cues?.length > 0 && (
            <div className="card p-5">
              <p className="label mb-2">SFX CUE SHEET</p>
              <ul className="text-sm space-y-1">
                {audioPlan.sfx_cues.map((s, i) => (
                  <li key={i} className="border-b border-neutral-100 py-1">
                    <span className="font-semibold">{s.time_sec}s</span> · {s.type} ({s.intensity}, {s.volume}) —{' '}
                    <span className="text-neutral-500">{s.purpose}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'CAPTIONS' && (
        <div className="space-y-4">
          <GenPanel
            label="GENERATE CAPTIONS"
            onClick={handleGenerateCaptions}
            loading={generatingCaptions}
            result={captionGenResult}
          />

          {captionTrack?.captions?.length > 0 && (
            <>
              <div className="card p-5">
                <p className="label mb-2">CAPTION TIMELINE</p>
                <ul className="text-sm space-y-1">
                  {captionTrack.captions.map((c, i) => (
                    <li key={i} className="border-b border-neutral-100 py-1">
                      <span className="text-neutral-400">
                        {c.start_sec}s–{c.end_sec}s
                      </span>{' '}
                      <span className="badge bg-neutral-100 text-neutral-600 text-[10px]">{c.type}</span> {c.text}{' '}
                      <span className="text-xs text-neutral-400">
                        ({c.position}, {c.animation})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="label">SRT</p>
                    <CopyButton text={captionTrack.srt} />
                  </div>
                  <pre className="codebox mt-2">{captionTrack.srt}</pre>
                </div>
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <p className="label">VTT</p>
                    <CopyButton text={captionTrack.vtt} />
                  </div>
                  <pre className="codebox mt-2">{captionTrack.vtt}</pre>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'EFFECTS' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <div className="flex gap-2">
              {EFFECT_BUDGETS.map((b) => (
                <button
                  key={b}
                  onClick={() => setEffectBudget(b)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    effectBudget === b ? 'bg-accent text-white border-accent' : 'border-neutral-300 text-neutral-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
            <button className="btn-secondary" onClick={handleGenerateEffects} disabled={generatingEffects}>
              {generatingEffects ? 'GENERATING...' : 'GENERATE EFFECT TIMELINE'}
            </button>
            {effectGenResult?.mode === 'template' && (
              <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                Claude CLI 미감지 — 프롬프트를 직접 실행하세요.
                <pre className="codebox mt-2">{effectGenResult.prompt}</pre>
              </div>
            )}
            {effectGenResult?.mode === 'error' && <p className="text-sm text-red-600">오류: {effectGenResult.error}</p>}
          </div>

          {effectTrack?.effects?.length > 0 && (
            <div className="card p-5">
              <p className="label mb-2">EFFECT TIMELINE</p>
              <ul className="space-y-2 text-sm">
                {effectTrack.effects.map((e, i) => (
                  <li key={i} className="border-b border-neutral-100 pb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge bg-neutral-900 text-white">{e.type}</span>
                      <span className="text-neutral-400 text-xs">
                        {e.start_sec}s–{e.end_sec}s
                      </span>
                      <span className="badge bg-neutral-100 text-neutral-600 text-[10px]">{e.purpose}</span>
                      <span className="text-xs text-neutral-400">strength: {e.strength}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{e.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'RENDER' && (
        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <p className="label">POST STUDIO — LOCAL RENDER</p>
            <p className="text-xs text-neutral-500">
              ASSETS 탭에서 각 Scene에 영상 클립을 연결하고, CAPTIONS/AUDIO를 먼저 생성해 두면 이 렌더에 반영됩니다. 이
              로컬 렌더러는 클립 연결·자막 하드섭·배경음악 믹스·화면비 변환·컷 순서까지 지원하며, Punch
              Zoom/Speed Ramp 등 고급 Effect는 아직 적용하지 않습니다(SIMPLIFIED로 표시).
            </p>
            <div className="flex gap-2">
              {RENDER_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setRenderPreset(p)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    renderPreset === p ? 'bg-accent text-white border-accent' : 'border-neutral-300 text-neutral-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={handleRender} disabled={rendering}>
              {rendering ? '렌더링 중... (수 초~수 분)' : `RENDER ${renderPreset}`}
            </button>
            {renderError && <p className="text-sm text-red-600">{renderError}</p>}
          </div>

          {latestJob && (
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <p className="label">최근 렌더 ({latestJob.preset})</p>
                <JobStatusBadge status={latestJob.status} />
              </div>

              {latestJob.manifest?.warnings?.length > 0 && (
                <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  {latestJob.manifest.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              )}

              {latestJob.status === 'FAILED' && <p className="text-sm text-red-600">{latestJob.error}</p>}

              {latestJob.status === 'COMPLETED' && (
                <>
                  <video controls className="w-full max-w-xs rounded-lg border border-neutral-200" src={`/api/production/render/${latestJob.id}/file`} />
                  <div className="grid md:grid-cols-3 gap-2 text-xs">
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">해상도</p>
                      <p className="font-semibold">{latestJob.report.output_resolution}</p>
                    </div>
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">길이 / FPS</p>
                      <p className="font-semibold">
                        {latestJob.report.duration_sec?.toFixed?.(1)}s / {latestJob.report.fps}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">파일 크기</p>
                      <p className="font-semibold">
                        {latestJob.report.file_size_bytes ? `${(latestJob.report.file_size_bytes / 1024 / 1024).toFixed(2)}MB` : '-'}
                      </p>
                    </div>
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">비디오 코덱</p>
                      <p className="font-semibold">{latestJob.report.video_codec}</p>
                    </div>
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">오디오 존재</p>
                      <p className="font-semibold">{String(latestJob.report.has_audio)}</p>
                    </div>
                    <div className="bg-neutral-50 rounded p-2">
                      <p className="text-neutral-400">렌더 시간</p>
                      <p className="font-semibold">{(latestJob.report.render_time_ms / 1000).toFixed(1)}s</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {renderJobs?.length > 1 && (
            <div className="card p-5">
              <p className="label mb-2">렌더 기록</p>
              <ul className="text-sm space-y-1">
                {renderJobs.map((j) => (
                  <li key={j.id} className="flex items-center justify-between border-b border-neutral-100 py-1">
                    <span>
                      {j.preset} · {new Date(j.created_at).toLocaleString('ko-KR')}
                    </span>
                    <JobStatusBadge status={j.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'PUBLISH' && (
        <div className="space-y-4">
          <GenPanel
            label="GENERATE PUBLISH PACK"
            onClick={handleGeneratePublish}
            loading={generatingPublish}
            result={publishGenResult}
          />

          {publishPack?.policy_review && Object.keys(publishPack.policy_review).length > 0 && (
            <div className="card p-5 space-y-3">
              <p className="label">POLICY REVIEW</p>
              <div className="grid md:grid-cols-4 gap-2">
                <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="text-xs">Policy Risk</span>
                  <PassBadge value={publishPack.policy_review.policy_risk} />
                </div>
                <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="text-xs">Copyright Risk</span>
                  <PassBadge value={publishPack.policy_review.copyright_risk} />
                </div>
                <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="text-xs">Misleading Metadata</span>
                  <PassBadge value={publishPack.policy_review.misleading_metadata} />
                </div>
                <div className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                  <span className="text-xs">Repetitive Content</span>
                  <PassBadge value={publishPack.policy_review.repetitive_content} />
                </div>
              </div>
              {publishPack.policy_review.notes && <p className="text-xs text-neutral-500">{publishPack.policy_review.notes}</p>}

              {publishPack.policy_review.ai_disclosure && (
                <div className="border-t border-neutral-100 pt-3">
                  <p className="label mb-2">AI DISCLOSURE REVIEW</p>
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    <p>
                      Realistic AI scene:{' '}
                      <span className="font-semibold">{String(publishPack.policy_review.ai_disclosure.realistic_ai_scene)}</span>
                    </p>
                    <p>
                      Real person depicted:{' '}
                      <span className="font-semibold">{String(publishPack.policy_review.ai_disclosure.real_person_depicted)}</span>
                    </p>
                    <p>
                      Viewer confusion risk:{' '}
                      <span className="font-semibold">{publishPack.policy_review.ai_disclosure.viewer_confusion_risk}</span>
                    </p>
                    <p>
                      추천:{' '}
                      <span className="badge bg-accent text-white">{publishPack.policy_review.ai_disclosure.recommendation}</span>
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2">최종 공개 표기 여부는 사용자가 직접 결정합니다.</p>
                </div>
              )}
            </div>
          )}

          {publishPack?.qc_checklist && Object.keys(publishPack.qc_checklist).length > 0 && (
            <div className="card p-5">
              <p className="label mb-2">CONTENT QC</p>
              <div className="grid md:grid-cols-3 gap-2">
                {Object.entries(publishPack.qc_checklist).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                    <span className="text-xs">{k.replace(/_/g, ' ')}</span>
                    <PassBadge value={v} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                이 체크는 기획/메타데이터 수준 QC입니다. 실제 렌더링된 영상 파일 QC(해상도/오디오/블랙프레임 등)는 Phase 3에서
                구현됩니다.
              </p>
            </div>
          )}

          {publishPack?.titles?.length > 0 && (
            <div className="card p-5 space-y-3">
              <p className="label">TOP 3 TITLES (전체 {publishPack.titles.length}개 중)</p>
              {publishPack.titles.slice(0, 3).map((t, i) => (
                <div key={i} className="border border-neutral-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-accent text-white text-[10px]">{t.style}</span>
                    <CopyButton text={t.text} />
                  </div>
                  <p className="text-sm font-semibold mt-1">{t.text}</p>
                  <p className="text-xs text-neutral-400 mt-1">{t.reason}</p>
                </div>
              ))}
              <details>
                <summary className="text-xs text-neutral-500 cursor-pointer">나머지 {publishPack.titles.length - 3}개 더 보기</summary>
                <div className="space-y-2 mt-2">
                  {publishPack.titles.slice(3).map((t, i) => (
                    <div key={i} className="border border-neutral-100 rounded-lg p-2 text-sm flex items-center justify-between">
                      <span>
                        {t.text} <span className="text-xs text-neutral-400">({t.style})</span>
                      </span>
                      <CopyButton text={t.text} />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {publishPack?.description && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">DESCRIPTION</p>
                <CopyButton text={publishPack.description} />
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{publishPack.description}</p>
            </div>
          )}

          {(publishPack?.hashtags?.length > 0 || publishPack?.tags?.length > 0) && (
            <div className="card p-5 grid md:grid-cols-2 gap-4">
              <div>
                <p className="label mb-1">HASHTAGS</p>
                <p className="text-sm text-neutral-600">{publishPack.hashtags.join(' ')}</p>
              </div>
              <div>
                <p className="label mb-1">TAGS</p>
                <p className="text-sm text-neutral-600">{publishPack.tags.join(', ')}</p>
              </div>
            </div>
          )}

          {publishPack?.thumbnail_concepts?.length > 0 && (
            <div className="card p-5 space-y-2">
              <p className="label">THUMBNAIL / COVER CONCEPTS (5)</p>
              <div className="grid md:grid-cols-2 gap-3">
                {publishPack.thumbnail_concepts.map((c, i) => (
                  <div key={i} className="border border-neutral-100 rounded-lg p-3 text-sm">
                    <p className="font-semibold">{c.subject}</p>
                    <p className="text-neutral-500 text-xs mt-1">
                      {c.moment} · {c.emotion}
                    </p>
                    <p className="text-neutral-400 text-xs mt-1">{c.composition}</p>
                    {c.text && <p className="text-xs mt-1">텍스트: &quot;{c.text}&quot;</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {publishPack?.instagram_caption && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">INSTAGRAM CAPTION</p>
                <CopyButton text={`${publishPack.instagram_caption}\n\n${(publishPack.instagram_hashtags || []).join(' ')}`} />
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{publishPack.instagram_caption}</p>
              <p className="text-sm text-neutral-500 mt-1">{(publishPack.instagram_hashtags || []).join(' ')}</p>
            </div>
          )}

          {publishPack?.pinned_comment && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">PINNED COMMENT</p>
                <CopyButton text={publishPack.pinned_comment} />
              </div>
              <p className="text-sm mt-2">{publishPack.pinned_comment}</p>
            </div>
          )}

          {publishPack && (
            <div className="card p-5">
              {publishPack.ready_to_publish ? (
                <p className="badge bg-accent2 text-white">READY TO PUBLISH — 승인 완료</p>
              ) : (
                <>
                  <button className="btn-primary" onClick={handleApprovePublish} disabled={approving}>
                    {approving ? '승인 중...' : 'APPROVE FINAL (Human Approval Gate)'}
                  </button>
                  <p className="text-xs text-neutral-400 mt-2">
                    자동 게시는 지원하지 않습니다. 승인 후에도 실제 업로드는 사용자가 YouTube/Instagram에 직접 진행합니다.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
