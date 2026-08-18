import path from 'node:path';
import { loadEnv } from './env.js';

loadEnv();

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

export const config = {
  headless: bool(process.env.HEADLESS, true),
  authStatePath: path.resolve(process.cwd(), process.env.AUTH_STATE_PATH || '.auth/openai-storage-state.json'),
  outputDir: path.resolve(process.cwd(), process.env.OUTPUT_DIR || './output'),
  chatgptUrl: process.env.CHATGPT_URL || 'https://chatgpt.com',
  soraUrl: process.env.SORA_URL || 'https://sora.chatgpt.com',
  naverClientId: process.env.NAVER_CLIENT_ID || '',
  naverClientSecret: process.env.NAVER_CLIENT_SECRET || '',
  topicCount: Number(process.env.TOPIC_COUNT || 1),
};
