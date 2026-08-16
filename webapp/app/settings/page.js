'use client';

import { useEffect, useState } from 'react';

const OBJECTIVES = [
  { key: 'views', label: 'Views' },
  { key: 'subscribers', label: 'Subscribers' },
  { key: 'watchTime', label: 'Watch Time' },
  { key: 'returningViewers', label: 'Returning Viewers' },
  { key: 'shares', label: 'Shares' },
  { key: 'comments', label: 'Comments' },
  { key: 'globalReach', label: 'Global Reach' },
  { key: 'seriesGrowth', label: 'Series Growth' },
];

const defaultProfile = {
  channelName: '',
  channelGoal: '',
  targetCountry: 'Global',
  targetLanguage: 'ko',
  primaryNiche: 'cinematic_fantasy',
  secondaryNiches: '',
  contentStyle: '',
  preferredVisualStyle: '',
  preferredVideoLength: 24,
  preferredClipCount: 3,
  higgsfieldPlan: 'Ultra',
  preferredVideoProvider: 'higgsfield',
  preferredAspectRatio: '9:16',
  productionCapacityPerDay: 2,
  shortsPriority: 8,
  longformPriority: 5,
  monetizationPriority: 9,
  objectiveWeights: OBJECTIVES.reduce((acc, o) => ({ ...acc, [o.key]: 5 }), {}),
};

function StatusBadge({ ok, label }) {
  return (
    <div className="flex items-center justify-between border border-neutral-100 rounded-lg px-3 py-2">
      <span className="text-sm">{label}</span>
      <span className={`badge ${ok ? 'bg-accent2 text-white' : 'bg-red-100 text-red-700'}`}>
        {ok ? 'READY' : 'NOT READY'}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/channel-profile')
      .then((r) => r.json())
      .then((data) => {
        if (data) setProfile({ ...defaultProfile, ...data });
      });
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/channel-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          Channel Profile은 Trend Radar의 Channel Fit Score, Today Top3 우선순위, Concept/Hook 생성 시 Claude에게 전달되는
          맥락으로 사용됩니다.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-semibold">SYSTEM STATUS</h2>
        {!status ? (
          <p className="text-sm text-neutral-400">확인 중...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            <StatusBadge ok={status.claudeCli} label="Claude Code CLI" />
            <StatusBadge ok={status.sqlite} label="SQLite (node:sqlite)" />
            <StatusBadge ok={status.workspaceWritable} label="Workspace 쓰기 권한" />
            <StatusBadge ok={status.ffmpeg} label="FFmpeg (Phase 3 이후 필요)" />
            <StatusBadge ok={status.ffprobe} label="FFprobe (Phase 3 이후 필요)" />
          </div>
        )}
        <p className="text-xs text-neutral-400">
          AI 엔진: <span className="font-semibold">{status?.engine === 'claude-cli' ? 'Claude CLI (실시간)' : 'Manual (프롬프트 복사)'}</span>
          {status?.engine !== 'claude-cli' && ' — claude CLI가 감지되지 않아 각 화면에서 프롬프트만 생성되고 자동 실행되지 않습니다.'}
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">CHANNEL PROFILE</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Channel Name</label>
            <input className="input" value={profile.channelName} onChange={(e) => setProfile({ ...profile, channelName: e.target.value })} />
          </div>
          <div>
            <label className="label">Channel Goal</label>
            <input className="input" value={profile.channelGoal} onChange={(e) => setProfile({ ...profile, channelGoal: e.target.value })} placeholder="예: 90일 내 Shorts 수익화 조건 달성" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Target Country</label>
            <input className="input" value={profile.targetCountry} onChange={(e) => setProfile({ ...profile, targetCountry: e.target.value })} />
          </div>
          <div>
            <label className="label">Target Language</label>
            <input className="input" value={profile.targetLanguage} onChange={(e) => setProfile({ ...profile, targetLanguage: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Primary Niche</label>
            <select className="input" value={profile.primaryNiche} onChange={(e) => setProfile({ ...profile, primaryNiche: e.target.value })}>
              <option value="cinematic_fantasy">AI 시네마틱 판타지 시리즈</option>
              <option value="food_cooking">음식/요리 비주얼</option>
              <option value="family_animation">가족·일상 애니메이션</option>
              <option value="non_verbal">비언어 글로벌 미니드라마</option>
            </select>
          </div>
          <div>
            <label className="label">Secondary Niches (comma separated)</label>
            <input className="input" value={profile.secondaryNiches} onChange={(e) => setProfile({ ...profile, secondaryNiches: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Content Style</label>
            <input className="input" value={profile.contentStyle} onChange={(e) => setProfile({ ...profile, contentStyle: e.target.value })} />
          </div>
          <div>
            <label className="label">Preferred Visual Style</label>
            <input className="input" value={profile.preferredVisualStyle} onChange={(e) => setProfile({ ...profile, preferredVisualStyle: e.target.value })} placeholder="예: painterly cinematic fantasy" />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="label">Video Length (sec)</label>
            <input type="number" className="input" value={profile.preferredVideoLength} onChange={(e) => setProfile({ ...profile, preferredVideoLength: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Clip Count</label>
            <input type="number" className="input" value={profile.preferredClipCount} onChange={(e) => setProfile({ ...profile, preferredClipCount: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Aspect Ratio</label>
            <select className="input" value={profile.preferredAspectRatio} onChange={(e) => setProfile({ ...profile, preferredAspectRatio: e.target.value })}>
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
          <div>
            <label className="label">Higgsfield Plan</label>
            <input className="input" value={profile.higgsfieldPlan} onChange={(e) => setProfile({ ...profile, higgsfieldPlan: e.target.value })} />
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="label">Default Video Provider</label>
            <select
              className="input"
              value={profile.preferredVideoProvider}
              onChange={(e) => setProfile({ ...profile, preferredVideoProvider: e.target.value })}
            >
              <option value="higgsfield">Higgsfield</option>
              <option value="google-flow">Google Flow / Veo</option>
              <option value="generic">Generic</option>
            </select>
            <p className="text-xs text-neutral-400 mt-1">
              새 Production 생성 시 PROMPTS 탭에 기본 선택될 Provider입니다. 언제든 Production별로 바꿀 수 있습니다.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="label">일일 제작량</label>
            <input type="number" className="input" value={profile.productionCapacityPerDay} onChange={(e) => setProfile({ ...profile, productionCapacityPerDay: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Shorts Priority (1-10)</label>
            <input type="number" min="1" max="10" className="input" value={profile.shortsPriority} onChange={(e) => setProfile({ ...profile, shortsPriority: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Long-form Priority (1-10)</label>
            <input type="number" min="1" max="10" className="input" value={profile.longformPriority} onChange={(e) => setProfile({ ...profile, longformPriority: Number(e.target.value) })} />
          </div>
          <div>
            <label className="label">Monetization Priority (1-10)</label>
            <input type="number" min="1" max="10" className="input" value={profile.monetizationPriority} onChange={(e) => setProfile({ ...profile, monetizationPriority: Number(e.target.value) })} />
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <p className="label mb-2">CHANNEL OBJECTIVES (Weight 1~10) — Channel Fit Score 계산에 사용</p>
          <div className="grid md:grid-cols-4 gap-3">
            {OBJECTIVES.map((o) => (
              <div key={o.key}>
                <label className="text-xs text-neutral-600">{o.label}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={profile.objectiveWeights[o.key]}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      objectiveWeights: { ...profile.objectiveWeights, [o.key]: Number(e.target.value) },
                    })
                  }
                  className="w-full"
                />
                <p className="text-center text-xs font-semibold">{profile.objectiveWeights[o.key]}</p>
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : 'Channel Profile 저장'}
        </button>
        {saved && <p className="text-xs text-accent2">저장되었습니다.</p>}
      </div>
    </div>
  );
}
