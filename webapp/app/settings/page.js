'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => setHasKey(d.hasKey));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: apiKey }),
      });
      const data = await res.json();
      setHasKey(data.hasKey);
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-neutral-500 mt-1 text-sm">
          OpenAI API 키는 선택 사항입니다. 키가 없어도 모든 단계에서 ChatGPT용 프롬프트를 생성하고 복사해 수동으로 사용할 수 있습니다.
          키를 등록하면 각 단계에서 "GPT로 바로 생성" 버튼이 실제 OpenAI API를 호출해 결과를 자동으로 채워줍니다.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <p className="text-sm">
          현재 상태:{' '}
          <span className={`badge ${hasKey ? 'bg-accent2 text-white' : 'bg-neutral-200 text-neutral-600'}`}>
            {hasKey ? 'API 키 등록됨' : '템플릿 모드 (키 없음)'}
          </span>
        </p>
        <div>
          <label className="label">OpenAI API 키</label>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <p className="text-xs text-accent2">저장되었습니다.</p>}
        <p className="text-xs text-neutral-400">
          키는 이 프로젝트의 <code>webapp/data/settings.json</code> 파일에 로컬로만 저장되며(.gitignore 처리됨), 외부로 전송되지
          않습니다. 서버가 재시작되어도 유지되지만, 다른 사람과 이 프로젝트 폴더를 공유할 경우 반드시 값을 비워주세요.
        </p>
      </div>
    </div>
  );
}
