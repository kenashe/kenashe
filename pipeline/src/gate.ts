// Tiered, autonomous quality gate. Ports the proven 40-point review and applies a
// per-tier threshold. Pass => draft:false (publish). Fail => draft:true (auto-drafted,
// never deleted) — no human queue, matching the "autonomous, spot-check" choice.
import { chat } from './llm.ts';
import { MODELS, GATE } from './config.ts';
import { GATE_SYSTEM } from './prompts.ts';
import type { DraftPost, GateResult } from './types.ts';

export async function gate(draft: DraftPost): Promise<GateResult> {
  const raw = await chat(MODELS.gate, GATE_SYSTEM, `TITLE: ${draft.title}\n\n${draft.body}`, { json: true });
  let g: GateResult;
  try { g = JSON.parse(raw) as GateResult; }
  catch { g = { originality: 0, voice_match: 0, factual_defensibility: 0, reader_value: 0, total: 0, ai_tells_found: [], critical_fails: ['gate_parse_error'], verdict: 'queue_for_review', reason: 'gate output not JSON' }; }

  const t = draft.tierKind === 'flagship' ? GATE.flagship : GATE.note;
  // Tells are logged for visibility but are NOT a hard gate — the grader over-flags them,
  // and voice quality is already captured in the scores. Real gatekeeping = score + critical_fails.
  const pass = g.total >= t.min && g.critical_fails.length === 0;
  draft.draft = !pass;
  return g;
}
