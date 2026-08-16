import { readSettings } from './db';

export function getApiKey() {
  const fromEnv = process.env.OPENAI_API_KEY;
  if (fromEnv) return fromEnv;
  const settings = readSettings();
  return settings.openaiApiKey || '';
}

export async function callOpenAI(prompt, { model = 'gpt-4o-mini', system } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('OpenAI API 키가 설정되어 있지 않습니다. 설정 페이지에서 키를 등록하거나, 생성된 프롬프트를 ChatGPT에 직접 붙여넣어 사용하세요.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API 오류 (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export function hasApiKey() {
  return Boolean(getApiKey());
}
