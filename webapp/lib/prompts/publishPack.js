export function buildPublishPackPrompt({ production, concept, hook, promptPack, profile }) {
  const storyboardText = (production.storyboard || [])
    .map((s) => `Scene ${s.scene_number} (${s.duration_sec}s): ${s.purpose}`)
    .join('\n');

  return `너는 YouTube/Instagram Publish Pack을 작성하는 메타데이터 에디터이자 정책 검토자다.

[컨셉] ${concept.title}
[로그라인] ${concept.logline}
[Hook] ${hook ? `${hook.type}: "${hook.hook_text}" / 내레이션: ${hook.narration}` : '미선택'}
[Storyboard]
${storyboardText || '(없음)'}
[채널] ${profile?.channelName || '미지정'}, 언어 ${profile?.targetLanguage || 'ko'}, 타깃 ${profile?.targetCountry || 'Global'}

작업:
1. 제목 후보 최소 15개 (CURIOSITY/EMOTIONAL/VISUAL/STORY/SIMPLE/SEARCH_FRIENDLY/GLOBAL/KOREAN 카테고리에서 고르게). 영상이 실제로 보여주지 않는 결과를 약속하지 마라 (Misleading Clickbait 금지).
2. Description: 강한 첫 줄 + 요약 + (시리즈 연결, 있다면) + 해시태그. Keyword Stuffing 금지.
3. Hashtag/Tag: 영상과 직접 관련된 것만.
4. 썸네일/커버 컨셉 5개 (자막 있는 버전/없는 버전 구분 포함).
5. Instagram Reels용 별도 캡션/해시태그 (YouTube 설명 재사용 금지).
6. Policy Review: policy_risk, copyright_risk, misleading_metadata, repetitive_content 각각 PASS/REVIEW/BLOCK.
7. AI Disclosure Review: 이 영상이 실사처럼 보일 수 있는 AI 생성 장면인지, 실존 인물/실제 사건을 묘사하는지 검토하고 LIKELY_NO_DISCLOSURE/REVIEW/LIKELY_DISCLOSURE 중 하나를 추천 (최종 결정은 사용자 몫임을 명시).
8. Content QC: Hook이 이해되는가, 스토리가 이해되는가, Payoff가 있는가, 엔딩이 급작스럽지 않은가, 자막이 유용한가, 효과가 과한가 — 각각 PASS/REVIEW로 판단.

아래 JSON 스키마만 출력해라. 설명 문장 없이 JSON만 출력한다.

{
  "titles": [
    { "text": "...", "style": "CURIOSITY | EMOTIONAL | VISUAL | STORY | SIMPLE | SEARCH_FRIENDLY | GLOBAL | KOREAN", "reason": "..." }
  ],
  "description": "...",
  "hashtags": ["#..."],
  "tags": ["..."],
  "thumbnail_concepts": [
    { "subject": "...", "moment": "...", "emotion": "...", "composition": "...", "text": "...", "no_text_version": true }
  ],
  "pinned_comment": "...",
  "instagram_caption": "...",
  "instagram_hashtags": ["#..."],
  "policy_review": {
    "policy_risk": "PASS | REVIEW | BLOCK",
    "copyright_risk": "PASS | REVIEW | BLOCK",
    "misleading_metadata": "PASS | REVIEW | BLOCK",
    "repetitive_content": "PASS | REVIEW | BLOCK",
    "notes": "..."
  },
  "ai_disclosure": {
    "realistic_ai_scene": true,
    "real_person_depicted": false,
    "real_event_simulation": false,
    "viewer_confusion_risk": "LOW | MEDIUM | HIGH",
    "recommendation": "LIKELY_NO_DISCLOSURE | REVIEW | LIKELY_DISCLOSURE"
  },
  "content_qc": {
    "hook_understandable": "PASS | REVIEW",
    "story_understandable": "PASS | REVIEW",
    "payoff_exists": "PASS | REVIEW",
    "ending_not_abrupt": "PASS | REVIEW",
    "captions_useful": "PASS | REVIEW",
    "effects_not_excessive": "PASS | REVIEW"
  }
}

titles는 최소 15개, thumbnail_concepts는 정확히 5개여야 한다.`;
}
