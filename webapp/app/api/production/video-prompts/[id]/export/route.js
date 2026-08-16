import { NextResponse } from 'next/server';
import { getVideoPromptsById, getProduction } from '../../../../../../lib/db/repo';

function clipToMarkdown(c) {
  const lines = [`## Clip ${c.scene_number} (${c.duration_sec}s)${c.recommended_mode ? ` — ${c.recommended_mode}` : ''}`];
  if (c.mode_reason) lines.push(`**추천 근거:** ${c.mode_reason}`);
  if (c.start_state) lines.push(`**Start State:** ${c.start_state}`);
  if (c.end_state) lines.push(`**End State:** ${c.end_state}`);
  if (c.ingredients_used?.length) lines.push(`**Ingredients:** ${c.ingredients_used.join(', ')}`);
  if (c.flow_prompt) lines.push(`\n**Flow Prompt:**\n${c.flow_prompt}`);
  if (c.start_frame_prompt) lines.push(`\n**Start Frame Prompt:**\n${c.start_frame_prompt}`);
  if (c.end_frame_prompt) lines.push(`\n**End Frame Prompt:**\n${c.end_frame_prompt}`);
  if (c.motion_bridge_prompt) lines.push(`\n**Motion Bridge Prompt:**\n${c.motion_bridge_prompt}`);
  if (c.subject) lines.push(`**Subject:** ${c.subject}`);
  if (c.action) lines.push(`**Action:** ${c.action}`);
  if (c.camera) lines.push(`**Camera:** ${c.camera}`);
  if (c.lighting) lines.push(`**Lighting:** ${c.lighting}`);
  if (c.environment) lines.push(`**Environment:** ${c.environment}`);
  if (c.continuity_notes) lines.push(`**Continuity:** ${c.continuity_notes}`);
  if (c.negative_constraints?.length) lines.push(`**Negative:** ${c.negative_constraints.join(', ')}`);
  return lines.join('\n');
}

function toMarkdown(record, production) {
  const header = `# ${record.provider} Prompts — ${production?.title || record.production_id} (v${record.version})\n\n생성 시각: ${record.created_at}`;
  const lock = record.global_visual_lock ? `## Global Visual Lock\n\n${record.global_visual_lock}` : '';
  const clips = (record.clips || []).map(clipToMarkdown).join('\n\n---\n\n');
  return [header, lock, clips].filter(Boolean).join('\n\n---\n\n') + '\n';
}

export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') === 'json' ? 'json' : 'md';
  const record = getVideoPromptsById(params.id);
  if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const production = getProduction(record.production_id);

  if (format === 'json') {
    return new NextResponse(JSON.stringify(record, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${record.provider}-prompts-v${record.version}.json"`,
      },
    });
  }

  return new NextResponse(toMarkdown(record, production), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${record.provider}-prompts-v${record.version}.md"`,
    },
  });
}
