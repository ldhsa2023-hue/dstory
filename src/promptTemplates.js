export function buildImagePrompt(topic) {
  return [
    '아래는 오늘 화제가 된 뉴스야.',
    `제목: ${topic.title}`,
    topic.summary ? `요약: ${topic.summary}` : '',
    '',
    '이 뉴스 내용을 상징적으로 표현하는, 저작권 문제가 없는 오리지널 스타일의 이미지를 하나 만들어줘.',
    '세로형(9:16) 비율로, 릴스/쇼츠 커버 이미지로 바로 쓸 수 있게 만들어줘.',
    '실제 인물의 초상권을 침해하지 않는 일러스트/그래픽 스타일로 부탁해.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildVideoPrompt(topic) {
  return [
    '방금 만든 이미지를 이어서, 릴스/쇼츠에 어울리는 트렌디한 짧은 영상으로 만들어줘.',
    '세로형(9:16), 15초 내외, 빠른 컷과 다이나믹한 카메라 무브먼트로 부탁해.',
    `주제: ${topic.title}`,
  ].join('\n');
}
