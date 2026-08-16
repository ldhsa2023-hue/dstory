'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CopyButton from '../../components/CopyButton';

const GENRES = [
  { key: 'cinematic_fantasy', label: 'AI 시네마틱 판타지 시리즈' },
  { key: 'food_cooking', label: '음식/요리 비주얼' },
  { key: 'family_animation', label: '가족·일상 애니메이션' },
  { key: 'non_verbal', label: '비언어 글로벌 미니드라마' },
];

const SCORE_FIELDS = [
  { key: 'genre_fit', label: '장르 적합성' },
  { key: 'higgsfield_feasibility', label: 'Higgsfield 구현 가능성' },
  { key: 'speed_fit', label: '속도 적합성' },
  { key: 'risk_low', label: '정책/저작권 리스크 낮음' },
  { key: 'brand_fit', label: '브랜드 적합성' },
];

const DECISION_LABEL = {
  'fast-track': { text: 'Fast-track', color: 'bg-accent text-white' },
  monitor: { text: 'Monitor', color: 'bg-amber-200 text-amber-900' },
  pass: { text: 'Pass', color: 'bg-neutral-200 text-neutral-600' },
};

function computeTotal(scores) {
  return SCORE_FIELDS.reduce((sum, f) => sum + (Number(scores[f.key]) || 0), 0);
}
function decisionFromTotal(total) {
  if (total >= 20) return 'fast-track';
  if (total >= 13) return 'monitor';
  return 'pass';
}

const emptyForm = {
  platform: 'YouTube Shorts',
  trend_type: 'format',
  description: '',
  genre: GENRES[0].key,
  characterRef: '',
  analysis: '',
  reinterpretation: '',
  scores: { genre_fit: 3, higgsfield_feasibility: 3, speed_fit: 3, risk_low: 3, brand_fit: 3 },
};

export default function TrendsPage() {
  const router = useRouter();
  const [trends, setTrends] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [gptPrompt, setGptPrompt] = useState('');
  const [gptResult, setGptResult] = useState('');
  const [gptMode, setGptMode] = useState('');
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/trends').then((r) => r.json()).then(setTrends);
  }, []);

  const total = computeTotal(form.scores);
  const decision = decisionFromTotal(total);

  function updateScore(key, value) {
    setForm((f) => ({ ...f, scores: { ...f.scores, [key]: Number(value) } }));
  }

  async function handleAnalyze() {
    setLoadingAnalyze(true);
    setGptResult('');
    try {
      const res = await fetch('/api/trends/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setGptPrompt(data.prompt);
      setGptMode(data.mode);
      if (data.result) {
        setGptResult(data.result);
        setForm((f) => ({ ...f, analysis: data.result }));
      }
    } finally {
      setLoadingAnalyze(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const item = await res.json();
      setTrends((prev) => [item, ...prev]);
      setForm(emptyForm);
      setGptPrompt('');
      setGptResult('');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await fetch(`/api/trends?id=${id}`, { method: 'DELETE' });
    setTrends((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleToIdea(trend) {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: trend.description.slice(0, 40),
        genre: trend.genre,
        format: 'shorts',
        logline: trend.reinterpretation || trend.analysis || trend.description,
        characterRef: trend.characterRef,
        reinterpretation: trend.reinterpretation || trend.analysis,
        source_trend_id: trend.id,
      }),
    });
    const idea = await res.json();
    router.push(`/scenes?ideaId=${idea.id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">1. 바이럴 영상 조사·분석·기획</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          발견한 트렌드를 기록하고, GPT 프롬프트로 구조를 분석해 우리 장르로 재해석한 뒤 적합도를 채점하세요.
          20점 이상이면 Fast-track으로 표시되어 바로 2단계(씬 생성)로 넘길 수 있습니다.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">새 트렌드 기록</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">출처 플랫폼</label>
            <input
              className="input"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              placeholder="YouTube Shorts / TikTok / Instagram Reels ..."
            />
          </div>
          <div>
            <label className="label">트렌드 유형</label>
            <select
              className="input"
              value={form.trend_type}
              onChange={(e) => setForm({ ...form, trend_type: e.target.value })}
            >
              <option value="format">포맷</option>
              <option value="sound_mashup">사운드/음원</option>
              <option value="challenge">챌린지</option>
              <option value="niche">니치/소재</option>
              <option value="production_trend">제작 트렌드</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">트렌드 설명</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="예: before/after 즉시 리빌 포맷 - 재료 클로즈업에서 완성 요리로 급전환하는 구조"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">타깃 장르</label>
            <select className="input" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })}>
              {GENRES.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">기존 캐릭터/세계관 (선택)</label>
            <input
              className="input"
              value={form.characterRef}
              onChange={(e) => setForm({ ...form, characterRef: e.target.value })}
              placeholder="예: 잊혀진 왕국 시리즈 - 수호자 캐릭터"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleAnalyze} disabled={loadingAnalyze || !form.description}>
            {loadingAnalyze ? '생성 중...' : 'GPT 트렌드 분석 프롬프트 생성'}
          </button>
        </div>

        {gptPrompt && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {gptMode === 'live' ? 'GPT 요청 프롬프트 (자동 실행됨)' : 'GPT 요청 프롬프트 (아래를 복사해 ChatGPT에 붙여넣으세요)'}
              </p>
              <CopyButton text={gptPrompt} />
            </div>
            <pre className="codebox">{gptPrompt}</pre>
          </div>
        )}

        {gptResult && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">GPT 분석/재해석 결과</p>
            <pre className="codebox">{gptResult}</pre>
          </div>
        )}

        <div>
          <label className="label">분석 결과 (수동 입력 또는 위 GPT 결과 붙여넣기)</label>
          <textarea
            className="input"
            rows={3}
            value={form.analysis}
            onChange={(e) => setForm({ ...form, analysis: e.target.value })}
          />
        </div>
        <div>
          <label className="label">우리 장르 재해석안</label>
          <textarea
            className="input"
            rows={3}
            value={form.reinterpretation}
            onChange={(e) => setForm({ ...form, reinterpretation: e.target.value })}
            placeholder="예: 판타지 시리즈에서 '숨어있던 존재가 처음부터 그 자리에 있었다' 반전 구조로 재현"
          />
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <p className="label mb-2">적합도 스코어 (1~5)</p>
          <div className="grid md:grid-cols-5 gap-4">
            {SCORE_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs text-neutral-600">{f.label}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={form.scores[f.key]}
                  onChange={(e) => updateScore(f.key, e.target.value)}
                  className="w-full"
                />
                <p className="text-center text-sm font-semibold">{form.scores[f.key]}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-neutral-500">합계 {total}/25</span>
            <span className={`badge ${DECISION_LABEL[decision].color}`}>{DECISION_LABEL[decision].text}</span>
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving || !form.description}>
          {saving ? '저장 중...' : '트렌드 저장'}
        </button>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">기록된 트렌드 ({trends.length})</h2>
        {trends.length === 0 ? (
          <p className="text-sm text-neutral-400">아직 기록된 트렌드가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {trends.map((t) => (
              <li key={t.id} className="border border-neutral-100 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {t.platform} · {GENRES.find((g) => g.key === t.genre)?.label || t.genre} ·{' '}
                      {new Date(t.created_at).toLocaleString('ko-KR')}
                    </p>
                    {t.reinterpretation && <p className="text-sm text-neutral-600 mt-2">{t.reinterpretation}</p>}
                  </div>
                  <span className={`badge shrink-0 ${DECISION_LABEL[t.decision]?.color}`}>
                    {DECISION_LABEL[t.decision]?.text} ({t.total}/25)
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-ghost text-xs" onClick={() => handleToIdea(t)}>
                    2단계(씬 생성)로 넘기기 →
                  </button>
                  <button className="btn-ghost text-xs text-red-600" onClick={() => handleDelete(t.id)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
