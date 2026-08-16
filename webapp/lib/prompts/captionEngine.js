export function buildCaptionPrompt({ production, concept, hook, promptPack }) {
  const storyboardText = (production.storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 Shorts 자막 디자이너다. 화면의 모든 말을 그대로 자막으로 옮기지 않는다 — 필요한 곳에만 짧게 넣는다.

[컨셉] ${concept.title}
[Hook 텍스트] ${hook?.hook_text || ''}
[Hook 내레이션] ${hook?.narration || ''}
[총 길이] ${production.target_duration}초

[Storyboard]
${storyboardText || '(없음)'}

작업: 이 영상의 자막 타임라인을 설계해라. 유형은 HOOK_TEXT, NARRATION, DIALOGUE, REACTION, KEYWORD, CTA 중 필요한 것만 사용한다. 모든 자막의 end_sec 합계가 ${production.target_duration}초를 넘지 않게 하고, 9:16 Safe Area(상하 여백)를 고려해 position을 지정한다.

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "captions": [
    {
      "start_sec": 0,
      "end_sec": 2,
      "text": "화면에 표시될 텍스트",
      "type": "HOOK_TEXT | NARRATION | DIALOGUE | REACTION | KEYWORD | CTA",
      "emphasis": "NONE | WORD | STRONG",
      "position": "TOP | CENTER | BOTTOM_SAFE",
      "animation": "POP | FADE | SLIDE | BOUNCE | NONE"
    }
  ]
}`;
}

export function captionsToSrt(captions) {
  return captions
    .map((c, i) => `${i + 1}\n${toSrtTime(c.start_sec)} --> ${toSrtTime(c.end_sec)}\n${c.text}\n`)
    .join('\n');
}

export function captionsToVtt(captions) {
  const body = captions.map((c) => `${toVttTime(c.start_sec)} --> ${toVttTime(c.end_sec)}\n${c.text}\n`).join('\n');
  return `WEBVTT\n\n${body}`;
}

function toSrtTime(sec) {
  return toTime(sec, ',');
}
function toVttTime(sec) {
  return toTime(sec, '.');
}
function toTime(sec, sep) {
  const s = Number(sec) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(ss)}${sep}${pad(ms, 3)}`;
}
