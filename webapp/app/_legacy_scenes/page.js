'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CopyButton from '../../components/CopyButton';

const GENRES = [
  { key: 'cinematic_fantasy', label: 'AI 시네마틱 판타지 시리즈' },
  { key: 'food_cooking', label: '음식/요리 비주얼' },
  { key: 'family_animation', label: '가족·일상 애니메이션' },
  { key: 'non_verbal', label: '비언어 글로벌 미니드라마' },
];

const emptyShot = () => ({ shot_number: 1, duration_sec: 5, visual_description: '', narration: '', subtitle: '' });

function SceneGenerationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ideaId = searchParams.get('ideaId');

  const [form, setForm] = useState({
    title: '',
    genre: GENRES[0].key,
    format: 'shorts',
    logline: '',
    characterRef: '',
    reinterpretation: '',
    shotCountHint: '4',
  });
  const [ideas, setIdeas] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('');
  const [rawPaste, setRawPaste] = useState('');
  const [shots, setShots] = useState([emptyShot()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/ideas').then((r) => r.json()).then(setIdeas);
    fetch('/api/scenes').then((r) => r.json()).then(setScenes);
  }, []);

  useEffect(() => {
    if (!ideaId || ideas.length === 0) return;
    const idea = ideas.find((i) => i.id === ideaId);
    if (idea) {
      setForm((f) => ({
        ...f,
        title: idea.title,
        genre: idea.genre || f.genre,
        format: idea.format || f.format,
        logline: idea.logline,
        characterRef: idea.characterRef,
        reinterpretation: idea.reinterpretation,
      }));
    }
  }, [ideaId, ideas]);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/scenes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setPrompt(data.prompt);
      setMode(data.mode);
      if (data.shots && data.shots.length > 0) {
        setShots(data.shots);
      }
    } finally {
      setLoading(false);
    }
  }

  function parsePaste() {
    try {
      const jsonMatch = rawPaste.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawPaste);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setShots(parsed);
      } else {
        alert('JSON 배열 형식이 아닙니다. GPT 출력을 다시 확인하세요.');
      }
    } catch {
      alert('JSON 파싱에 실패했습니다. GPT 출력에서 JSON 배열 부분만 붙여넣어 보세요.');
    }
  }

  function updateShot(idx, key, value) {
    setShots((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }
  function addShot() {
    setShots((prev) => [...prev, { ...emptyShot(), shot_number: prev.length + 1 }]);
  }
  function removeShot(idx) {
    setShots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSaveScene() {
    setSaving(true);
    try {
      const res = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea_id: ideaId || null,
          title: form.title,
          genre: form.genre,
          format: form.format,
          characterRef: form.characterRef,
          shots,
        }),
      });
      const item = await res.json();
      setScenes((prev) => [item, ...prev]);
      router.push(`/higgsfield?sceneId=${item.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">2. 씬/삽화 생성용 GPT 프롬프트</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          기획안을 샷(장면) 단위 대본으로 쪼개는 GPT 프롬프트를 생성합니다. API 키가 설정되어 있으면 자동으로 실행되어 샷 표가 채워지고,
          아니면 프롬프트를 복사해 ChatGPT에 붙여넣은 뒤 결과를 아래에 붙여넣어 파싱하세요.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">기획 입력</h2>
        {ideas.length > 0 && (
          <div>
            <label className="label">1단계에서 넘어온 기획 선택 (선택)</label>
            <select
              className="input"
              value={ideaId || ''}
              onChange={(e) => router.push(e.target.value ? `/scenes?ideaId=${e.target.value}` : '/scenes')}
            >
              <option value="">직접 입력</option>
              {ideas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">제목</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">장르</label>
            <select className="input" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              {GENRES.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">포맷</label>
            <select className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
              <option value="shorts">Shorts (15~30초)</option>
              <option value="longform">Long-form (3~8분)</option>
            </select>
          </div>
          <div>
            <label className="label">샷 개수 (대략)</label>
            <input
              className="input"
              value={form.shotCountHint}
              onChange={(e) => setForm({ ...form, shotCountHint: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">로그라인</label>
          <textarea className="input" rows={2} value={form.logline} onChange={(e) => setForm({ ...form, logline: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">기존 캐릭터/세계관</label>
            <input
              className="input"
              value={form.characterRef}
              onChange={(e) => setForm({ ...form, characterRef: e.target.value })}
            />
          </div>
          <div>
            <label className="label">트렌드 재해석 메모</label>
            <input
              className="input"
              value={form.reinterpretation}
              onChange={(e) => setForm({ ...form, reinterpretation: e.target.value })}
            />
          </div>
        </div>

        <button className="btn-secondary" onClick={handleGenerate} disabled={loading || !form.logline}>
          {loading ? '생성 중...' : 'GPT 씬 생성 프롬프트 만들기'}
        </button>

        {prompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {mode === 'live' ? 'GPT 요청 프롬프트 (자동 실행되어 아래 샷 표에 반영됨)' : 'GPT 요청 프롬프트 (복사해서 ChatGPT에 붙여넣으세요)'}
              </p>
              <CopyButton text={prompt} />
            </div>
            <pre className="codebox">{prompt}</pre>
          </div>
        )}

        {mode === 'template' && (
          <div className="space-y-2">
            <label className="label">ChatGPT 출력 결과 붙여넣기 (JSON 배열)</label>
            <textarea
              className="input font-mono text-xs"
              rows={6}
              value={rawPaste}
              onChange={(e) => setRawPaste(e.target.value)}
              placeholder='[{"shot_number":1,"duration_sec":5,"visual_description":"...","narration":"...","subtitle":"..."}]'
            />
            <button className="btn-ghost" onClick={parsePaste}>
              붙여넣은 내용 파싱해서 아래 표에 반영
            </button>
          </div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">샷 리스트 (직접 수정 가능)</h2>
          <button className="btn-ghost text-xs" onClick={addShot}>
            + 샷 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-400 text-xs uppercase">
                <th className="py-1 pr-2 w-12">#</th>
                <th className="py-1 pr-2 w-16">초</th>
                <th className="py-1 pr-2">화면 묘사</th>
                <th className="py-1 pr-2">내레이션/대사</th>
                <th className="py-1 pr-2">자막</th>
                <th className="py-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {shots.map((s, idx) => (
                <tr key={idx} className="border-t border-neutral-100 align-top">
                  <td className="py-2 pr-2">
                    <input
                      className="input"
                      value={s.shot_number}
                      onChange={(e) => updateShot(idx, 'shot_number', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      className="input"
                      value={s.duration_sec}
                      onChange={(e) => updateShot(idx, 'duration_sec', Number(e.target.value))}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <textarea
                      className="input"
                      rows={2}
                      value={s.visual_description}
                      onChange={(e) => updateShot(idx, 'visual_description', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <textarea
                      className="input"
                      rows={2}
                      value={s.narration}
                      onChange={(e) => updateShot(idx, 'narration', e.target.value)}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <textarea
                      className="input"
                      rows={2}
                      value={s.subtitle}
                      onChange={(e) => updateShot(idx, 'subtitle', e.target.value)}
                    />
                  </td>
                  <td className="py-2">
                    <button className="text-red-500 text-xs" onClick={() => removeShot(idx)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-primary" onClick={handleSaveScene} disabled={saving || !form.title}>
          {saving ? '저장 중...' : '씬 저장하고 3단계로 넘기기 →'}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">저장된 씬 ({scenes.length})</h2>
        {scenes.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 저장된 씬이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {scenes.map((sc) => (
              <li key={sc.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{sc.title}</p>
                  <p className="text-xs text-neutral-400">
                    샷 {sc.shots.length}개 · {new Date(sc.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
                <button className="btn-ghost text-xs" onClick={() => router.push(`/higgsfield?sceneId=${sc.id}`)}>
                  3단계로 넘기기 →
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ScenesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400">불러오는 중...</p>}>
      <SceneGenerationInner />
    </Suspense>
  );
}
