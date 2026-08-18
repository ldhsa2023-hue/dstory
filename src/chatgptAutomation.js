import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

// ChatGPT/Sora 웹 UI는 예고 없이 바뀔 수 있습니다. 아래 셀렉터들이 더 이상 맞지 않는다면
// HEADLESS=false 로 실행해 실제 화면을 보면서 selector를 갱신하세요. 실패 시 output/debug 에
// 스크린샷이 남습니다.
const IMAGE_GEN_TIMEOUT_MS = 3 * 60 * 1000;
const VIDEO_GEN_TIMEOUT_MS = 8 * 60 * 1000;

async function debugScreenshot(page, name) {
  try {
    const dir = path.join(config.outputDir, 'debug');
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${name}-${Date.now()}.png`), fullPage: true });
  } catch {
    // 디버그 스크린샷 자체가 실패해도 원래 에러를 그대로 던지도록 무시합니다.
  }
}

async function findComposer(page) {
  const candidates = [
    page.locator('#prompt-textarea'),
    page.getByRole('textbox', { name: /message|prompt|메시지/i }),
    page.locator('div[contenteditable="true"]').first(),
  ];
  for (const locator of candidates) {
    if (await locator.count()) return locator;
  }
  throw new Error('메시지 입력창을 찾지 못했습니다. 웹 UI가 변경되었을 수 있습니다.');
}

async function sendMessage(page, text) {
  const composer = await findComposer(page);
  await composer.click();
  await composer.fill(text);
  await page.keyboard.press('Enter');
}

async function waitForImageInLatestReply(page, timeoutMs) {
  const image = page.locator('main img[src*="oaiusercontent"], main img[alt]').last();
  await image.waitFor({ state: 'visible', timeout: timeoutMs });
  return image;
}

export async function generateNewsImage(context, { prompt, outFile }) {
  const page = await context.newPage();
  try {
    await page.goto(config.chatgptUrl, { waitUntil: 'domcontentloaded' });
    await sendMessage(page, prompt);
    const image = await waitForImageInLatestReply(page, IMAGE_GEN_TIMEOUT_MS);
    const src = await image.getAttribute('src');
    if (!src) throw new Error('생성된 이미지의 src 속성을 찾지 못했습니다.');
    const response = await context.request.get(src);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, await response.body());
    return { outFile, page };
  } catch (err) {
    await debugScreenshot(page, 'image-generation-error');
    throw err;
  }
}

async function findFileInput(page) {
  const input = page.locator('input[type="file"]').first();
  if (await input.count()) return input;
  throw new Error('이미지 업로드 입력을 찾지 못했습니다. Sora UI가 변경되었을 수 있습니다.');
}

export async function generateShortsVideo(context, { imageFile, prompt, outFile }) {
  const page = await context.newPage();
  try {
    await page.goto(config.soraUrl, { waitUntil: 'domcontentloaded' });
    const fileInput = await findFileInput(page);
    await fileInput.setInputFiles(imageFile);

    const composer = await findComposer(page);
    await composer.click();
    await composer.fill(prompt);
    await page.keyboard.press('Enter');

    const downloadPromise = page.waitForEvent('download', { timeout: VIDEO_GEN_TIMEOUT_MS });
    const generatedVideo = page.locator('video').last();
    await generatedVideo.waitFor({ state: 'visible', timeout: VIDEO_GEN_TIMEOUT_MS });

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const downloadButton = page.getByRole('button', { name: /download|다운로드/i }).last();
    if (await downloadButton.count()) {
      await downloadButton.click();
      const download = await downloadPromise;
      await download.saveAs(outFile);
    } else {
      const src = await generatedVideo.getAttribute('src');
      if (!src) throw new Error('생성된 영상의 src 속성을 찾지 못했습니다.');
      const response = await context.request.get(src);
      fs.writeFileSync(outFile, await response.body());
    }
    return { outFile, page };
  } catch (err) {
    await debugScreenshot(page, 'video-generation-error');
    throw err;
  }
}
