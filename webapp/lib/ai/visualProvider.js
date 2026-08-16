import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ClaudeCLIEngine } from './engine';

const execFileAsync = promisify(execFile);

function extractJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * ClaudeVisualProvider — asks the local Claude CLI to actually open a real
 * keyframe file (via its own Read tool, --allowedTools Read only) and
 * describe what's in it. This is a genuine visual read of a file that
 * exists on disk, not a guess — confirmed working in this session (a
 * synthetic test frame's burned-in text was read back correctly).
 */
export class ClaudeVisualProvider {
  async isAvailable() {
    return new ClaudeCLIEngine().isAvailable();
  }

  async describeImage(imagePath, { contextHint } = {}) {
    const prompt = `Read the image file at exactly this path: ${imagePath}
${contextHint ? `Context: ${contextHint}` : ''}

Describe only what you can actually see in this specific image. Do not guess at video motion, sound, or content outside this single frame.

Output ONLY this JSON, no other text:
{
  "description": "1-2 sentences describing what is visible in this frame",
  "dominant_colors": ["color1", "color2"],
  "potential_issues": ["CHARACTER_ERROR | GENERATION_ERROR | BAD_FRAME | CONTINUITY_ERROR - only if actually visible, else empty array"],
  "text_visible_in_frame": "any readable text burned into the image, or empty string",
  "confidence": "HIGH | MEDIUM | LOW"
}`;

    const args = ['-p', prompt, '--output-format', 'json', '--allowedTools', 'Read'];
    let stdout;
    try {
      ({ stdout } = await execFileAsync('claude', args, { timeout: 60000, maxBuffer: 5 * 1024 * 1024 }));
    } catch (err) {
      return { description: null, error: `Claude visual read 실패: ${err.message}`, confidence: 'UNAVAILABLE' };
    }

    let envelope;
    try {
      envelope = JSON.parse(stdout);
    } catch {
      return { description: null, error: 'Claude CLI 응답 파싱 실패', confidence: 'UNAVAILABLE' };
    }
    if (envelope.is_error) {
      return { description: null, error: envelope.result || 'unknown error', confidence: 'UNAVAILABLE' };
    }

    const parsed = extractJson(envelope.result || '');
    if (!parsed) {
      return { description: envelope.result?.slice(0, 300) || null, potential_issues: [], confidence: 'LOW' };
    }
    return { ...parsed, provider: 'claude-cli' };
  }
}

/** ManualVisualProvider — no automated read; UI shows the contact sheet for a human to annotate instead. */
export class ManualVisualProvider {
  async isAvailable() {
    return true;
  }
  async describeImage() {
    return { description: null, provider: 'manual', note: 'Claude CLI 미감지 - Contact Sheet를 사람이 직접 확인하세요.' };
  }
}

export async function getVisualProvider() {
  const claude = new ClaudeVisualProvider();
  const available = await claude.isAvailable();
  return available ? claude : new ManualVisualProvider();
}
