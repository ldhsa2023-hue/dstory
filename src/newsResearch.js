import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

// 구글 뉴스(한국) RSS - API 키 없이 그날의 인기 뉴스를 가져옵니다.
const GOOGLE_NEWS_RSS_URL = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

function decodeEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripCdata(str) {
  const m = str.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return m ? m[1] : str;
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return decodeEntities(stripCdata(m[1]).trim());
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').trim();
}

async function fetchGoogleNewsTopics(count) {
  const res = await fetch(GOOGLE_NEWS_RSS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`구글 뉴스 RSS 요청 실패: ${res.status}`);
  const xml = await res.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.slice(0, count).map((block) => {
    const rawTitle = extractTag(block, 'title');
    const sep = rawTitle.lastIndexOf(' - ');
    const title = sep === -1 ? rawTitle : rawTitle.slice(0, sep);
    const source = sep === -1 ? '' : rawTitle.slice(sep + 3);
    return {
      title,
      source,
      link: extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      summary: stripHtml(extractTag(block, 'description')),
    };
  });
}

async function fetchNaverTopics(count) {
  const url = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent('오늘 화제')}&sort=sim&display=${count}`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': config.naverClientId,
      'X-Naver-Client-Secret': config.naverClientSecret,
    },
  });
  if (!res.ok) throw new Error(`네이버 뉴스 API 요청 실패: ${res.status}`);
  const data = await res.json();
  return data.items.map((item) => ({
    title: decodeEntities(stripHtml(item.title)),
    source: '네이버뉴스',
    link: item.originallink || item.link,
    pubDate: item.pubDate,
    summary: decodeEntities(stripHtml(item.description)),
  }));
}

// 네이버 API 키가 설정되어 있으면 그쪽을 우선 사용하고, 없으면 구글 뉴스 RSS로 대체합니다.
export async function fetchTrendingTopics(count = config.topicCount) {
  if (config.naverClientId && config.naverClientSecret) {
    return fetchNaverTopics(count);
  }
  return fetchGoogleNewsTopics(count);
}

export function todayTopicPath(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return path.resolve(process.cwd(), 'data', 'topics', `${iso}.json`);
}

export async function fetchAndSaveTodayTopics(count = config.topicCount) {
  const topics = await fetchTrendingTopics(count);
  const outPath = todayTopicPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ fetchedAt: new Date().toISOString(), topics }, null, 2));
  return { outPath, topics };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  fetchAndSaveTodayTopics()
    .then(({ outPath, topics }) => {
      console.log(`오늘의 뉴스 주제 ${topics.length}건을 저장했습니다: ${outPath}`);
      for (const t of topics) console.log(`- [${t.source || '출처 미상'}] ${t.title}`);
    })
    .catch((err) => {
      console.error('뉴스 조사 실패:', err.message);
      process.exit(1);
    });
}
