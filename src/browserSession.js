import fs from 'node:fs';
import { chromium } from 'playwright';
import { config } from './config.js';

export async function openAuthedBrowser({ headless = config.headless } = {}) {
  if (!fs.existsSync(config.authStatePath)) {
    throw new Error(
      `로그인 세션 파일이 없습니다: ${config.authStatePath}\n` +
        `화면(디스플레이)이 있는 환경(로컬 PC 등)에서 'npm run login' 을 먼저 실행해 ChatGPT/Sora에 로그인하고, ` +
        `그 결과 파일을 이 저장소가 실행되는 위치의 같은 경로에 두세요.`,
    );
  }
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    storageState: config.authStatePath,
    viewport: { width: 1280, height: 900 },
  });
  return { browser, context };
}
