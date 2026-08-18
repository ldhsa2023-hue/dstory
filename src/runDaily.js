import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { fetchAndSaveTodayTopics, todayTopicPath } from './newsResearch.js';
import { hasCovered, recordEntry } from './history.js';
import { openAuthedBrowser } from './browserSession.js';
import { generateNewsImage, generateShortsVideo } from './chatgptAutomation.js';
import { buildImagePrompt, buildVideoPrompt } from './promptTemplates.js';

function slugify(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'topic'
  );
}

// data/topics/<오늘날짜>.json 이 이미 있으면 그걸 그대로 쓰고(예: Claude Code가 WebSearch로
// 미리 조사해둔 경우), --fetch-news 가 붙었거나 파일이 없으면 구글 뉴스 RSS로 새로 조사합니다.
async function loadTodayTopics({ forceFetch }) {
  const topicPath = todayTopicPath();
  if (!forceFetch && fs.existsSync(topicPath)) {
    return JSON.parse(fs.readFileSync(topicPath, 'utf8')).topics;
  }
  const { topics } = await fetchAndSaveTodayTopics();
  return topics;
}

async function processTopic(context, topic) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(topic.title);
  const imageFile = path.join(config.outputDir, 'images', `${date}-${slug}.png`);
  const videoFile = path.join(config.outputDir, 'videos', `${date}-${slug}.mp4`);

  console.log(`[이미지 생성] ${topic.title}`);
  const { outFile: savedImage, page: imagePage } = await generateNewsImage(context, {
    prompt: buildImagePrompt(topic),
    outFile: imageFile,
  });
  await imagePage.close();
  console.log(`이미지 저장 완료: ${savedImage}`);

  console.log(`[영상 생성] ${topic.title}`);
  const { outFile: savedVideo, page: videoPage } = await generateShortsVideo(context, {
    imageFile: savedImage,
    prompt: buildVideoPrompt(topic),
    outFile: videoFile,
  });
  await videoPage.close();
  console.log(`영상 저장 완료: ${savedVideo}`);

  recordEntry({ title: topic.title, link: topic.link, imageFile: savedImage, videoFile: savedVideo });
  return { savedImage, savedVideo };
}

async function main() {
  const forceFetch = process.argv.includes('--fetch-news');
  const topics = await loadTodayTopics({ forceFetch });
  if (!topics.length) {
    console.log('오늘 조사된 뉴스 주제가 없습니다.');
    return;
  }

  const freshTopics = topics.filter((t) => !hasCovered(t.title));
  if (!freshTopics.length) {
    console.log('오늘 주제는 이미 모두 처리되었습니다 (data/history.json 참고).');
    return;
  }

  const { browser, context } = await openAuthedBrowser();
  const results = [];
  try {
    for (const topic of freshTopics.slice(0, config.topicCount)) {
      try {
        results.push(await processTopic(context, topic));
      } catch (err) {
        console.error(`"${topic.title}" 처리 중 오류 발생: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`총 ${results.length}건의 영상을 생성했습니다.`);
  for (const r of results) console.log(`- ${r.savedVideo}`);
}

main().catch((err) => {
  console.error('일일 자동화 실패:', err.message);
  process.exit(1);
});
