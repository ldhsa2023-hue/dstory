import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';
import { config } from '../src/config.js';

// 이 스크립트는 반드시 화면(디스플레이)이 있는 환경(로컬 PC 등)에서 실행하세요.
// 원격 클라우드 샌드박스에는 화면이 없어 로그인(캡차 포함)을 직접 진행할 수 없습니다.
async function waitForEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(message);
  rl.close();
}

async function main() {
  console.log('브라우저 창이 열립니다. 창에서 직접 로그인해주세요.');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  const chatPage = await context.newPage();
  await chatPage.goto(config.chatgptUrl);
  await waitForEnter('ChatGPT(chatgpt.com)에 로그인한 뒤 Enter 키를 누르세요...');

  const soraPage = await context.newPage();
  await soraPage.goto(config.soraUrl);
  await waitForEnter('Sora(sora.chatgpt.com)에도 로그인되어 있는지 확인한 뒤 Enter 키를 누르세요...');

  fs.mkdirSync(path.dirname(config.authStatePath), { recursive: true });
  await context.storageState({ path: config.authStatePath });
  console.log(`로그인 세션을 저장했습니다: ${config.authStatePath}`);
  console.log('이 파일은 로그인 쿠키를 담고 있으므로 절대 git에 커밋하거나 공유하지 마세요.');

  await browser.close();
}

main().catch((err) => {
  console.error('로그인 설정 실패:', err.message);
  process.exit(1);
});
