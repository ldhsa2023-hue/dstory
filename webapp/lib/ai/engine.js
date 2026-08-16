import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class AIEngineError extends Error {}

// ---------- JSON extraction helper ----------
function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // fall through to bracket-matching extraction
  }
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  let start = -1;
  let openChar = '{';
  let closeChar = '}';
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    openChar = '[';
    closeChar = ']';
  } else if (firstObj !== -1) {
    start = firstObj;
  }
  if (start === -1) return null;
  const end = text.lastIndexOf(closeChar);
  if (end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * ClaudeCLIEngine — spawns the local `claude` CLI in non-interactive print mode
 * (`claude -p ... --output-format json`) as the AIEngine backend for text/JSON
 * generation tasks (trend research, concept/hook writing, prompt authoring).
 * It never generates images or video itself, and never calls ChatGPT/Higgsfield
 * APIs directly — those stay manual (copy-paste), per the product's automation
 * boundary.
 */
export class ClaudeCLIEngine {
  constructor({ model } = {}) {
    this.model = model || null;
  }

  async isAvailable() {
    try {
      await execFileAsync('claude', ['--version'], { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async generateJSON({ prompt, system, allowedTools = [], timeoutMs = 120000 }) {
    const raw = await this._call({ prompt, system, allowedTools, timeoutMs });
    let parsed = extractJson(raw);
    if (parsed !== null) return { data: parsed, raw };

    // Retry once with validation feedback, per spec 77.
    const retryPrompt = `이전 응답이 유효한 JSON이 아니었다. 아래는 이전 응답의 앞부분이다:\n\n${raw.slice(
      0,
      500
    )}\n\n다시, 유효한 JSON만 출력해라. 설명 문장을 앞뒤에 절대 붙이지 마라. 원래 요청:\n\n${prompt}`;
    const raw2 = await this._call({ prompt: retryPrompt, system, allowedTools, timeoutMs });
    parsed = extractJson(raw2);
    if (parsed !== null) return { data: parsed, raw: raw2 };

    throw new AIEngineError('Claude CLI 응답에서 유효한 JSON을 추출하지 못했습니다 (재시도 1회 포함).');
  }

  async _call({ prompt, system, allowedTools, timeoutMs }) {
    const args = ['-p', prompt, '--output-format', 'json'];
    if (system) args.push('--append-system-prompt', system);
    args.push('--allowedTools', allowedTools.join(' '));
    if (this.model) args.push('--model', this.model);

    let stdout;
    try {
      ({ stdout } = await execFileAsync('claude', args, {
        timeout: timeoutMs,
        maxBuffer: 20 * 1024 * 1024,
      }));
    } catch (err) {
      if (err.killed || err.signal === 'SIGTERM') {
        throw new AIEngineError(
          `Claude CLI 응답 시간 초과 (${Math.round(timeoutMs / 1000)}초 제한). WebSearch 조사가 오래 걸리는 요청일 수 있습니다. 다시 시도해보세요.`
        );
      }
      throw new AIEngineError(`Claude CLI 실행 실패: ${err.message}`);
    }

    let envelope;
    try {
      envelope = JSON.parse(stdout);
    } catch {
      throw new AIEngineError('Claude CLI 출력 파싱 실패 (JSON envelope 아님).');
    }
    if (envelope.is_error) {
      throw new AIEngineError(`Claude CLI 오류: ${envelope.result || 'unknown error'}`);
    }
    return envelope.result || '';
  }
}

/**
 * ManualEngine — no live call. generateJSON always returns null, signalling
 * "template mode": callers should show the built prompt for the user to
 * paste into Claude/ChatGPT themselves and paste the result back in.
 */
export class ManualEngine {
  async isAvailable() {
    return true;
  }

  async generateJSON() {
    return { data: null, raw: null };
  }
}

let cachedEngine = null;
let cachedAt = 0;

export async function getEngine({ forceManual = false } = {}) {
  if (forceManual) return new ManualEngine();
  const now = Date.now();
  if (cachedEngine && now - cachedAt < 60000) return cachedEngine;
  const claude = new ClaudeCLIEngine();
  const available = await claude.isAvailable();
  cachedEngine = available ? claude : new ManualEngine();
  cachedAt = now;
  return cachedEngine;
}

export async function engineStatus() {
  const claude = new ClaudeCLIEngine();
  const available = await claude.isAvailable();
  return { engine: available ? 'claude-cli' : 'manual', claudeCliAvailable: available };
}
