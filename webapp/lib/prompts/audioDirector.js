export function buildAudioDirectorPrompt({ production, concept, hook }) {
  const storyboardText = (production.storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 Audio Director다. 음악을 직접 생성하지 않는다 — 외부 음악 생성 AI(Suno 등)에 붙여넣을 프롬프트와, 이 영상 타임라인에 맞춘 음악/SFX 큐시트를 설계한다.

[컨셉] ${concept.title} — ${concept.logline}
[Hook] ${hook ? `${hook.type}: "${hook.hook_text}"` : '미선택'}
[길이] 총 ${production.target_duration}초

[Storyboard]
${storyboardText || '(스토리보드 없음 - Prompt Pack을 먼저 생성하세요)'}

작업:
1. 이 영상에 맞는 음악 Blueprint를 설계한다 (목적/무드/장르/에너지/템포/BPM 범위/악기 구성/Vocals 여부, 그리고 Intro→Build→Peak→Payoff→Outro/Loop 구조).
2. 특정 음악 서비스에 종속되지 않는 범용 Music Master Prompt를 한 문단으로 작성한다.
3. 위 Storyboard의 실제 씬 길이에 맞춰 Music Timeline을 만든다 (총 길이를 절대 넘지 않는다).
4. Storyboard 각 씬의 Purpose에 맞는 SFX Cue를 필요한 곳에만 절제해서 배치한다 (과도하게 넣지 않는다).

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "blueprint": {
    "purpose": "이 음악이 하는 역할 1문장",
    "mood": "...",
    "genre": "...",
    "energy": "LOW | MEDIUM | HIGH",
    "tempo": "SLOW | MEDIUM | FAST",
    "bpm_range": "90-110",
    "instrumentation": "...",
    "structure": { "intro": "...", "build": "...", "peak": "...", "payoff": "...", "outro_loop": "..." },
    "vocals": "no vocals | vocals"
  },
  "music_prompt": "외부 음악 생성 AI에 그대로 붙여넣을 완전한 프롬프트 (영어 권장)",
  "music_timeline": [
    { "start_sec": 0, "end_sec": 3, "section": "Intro | Build | Peak | Payoff | Outro" }
  ],
  "sfx_cues": [
    {
      "time_sec": 0.5,
      "type": "WHOOSH | IMPACT | RISER | POP | CLICK | SWIPE | BOOM | SPARKLE | AMBIENCE | MAGIC | CRUNCH",
      "intensity": "LOW | MEDIUM | HIGH",
      "purpose": "왜 이 지점에 필요한지",
      "volume": "예: -6dB"
    }
  ]
}

music_timeline의 end_sec 합계가 ${production.target_duration}초를 넘지 않도록 한다. SFX는 스토리 전환/충격 지점에만 배치하고 과용하지 않는다.`;
}
