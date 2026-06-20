import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { SourceConfig } from './types.ts';

export const env = {
  storeBackend: process.env.STORE_BACKEND ?? 'file',
  storeFile: process.env.STORE_FILE_PATH ?? '.state/store.json',
  databaseUrl: process.env.DATABASE_URL ?? '',
  flagships: Number(process.env.DAILY_FLAGSHIPS ?? 3),
  notesMax: Number(process.env.DAILY_NOTES_MAX ?? 7),
  dedupSim: Number(process.env.DEDUP_SIMILARITY ?? 0.82),
  clusterSim: Number(process.env.CLUSTER_SIMILARITY ?? 0.78),
  cooldownDays: Number(process.env.TOPIC_COOLDOWN_DAYS ?? 14),
  githubRepo: process.env.GITHUB_REPO ?? 'kenashe/kenashe',
  gitBranch: process.env.GIT_BRANCH ?? 'master',
  vercelHook: process.env.VERCEL_DEPLOY_HOOK ?? '',
  telegram: { token: process.env.TELEGRAM_BOT_TOKEN ?? '', chat: process.env.TELEGRAM_CHAT_ID ?? '' },
};

// Per-stage model assignment. Cheap models for high-volume triage; premium for
// flagship prose; a DIFFERENT model for the gate than the drafter (independent check).
export const MODELS = {
  triage: { provider: 'deepseek', model: 'deepseek-chat' },
  flagship: { provider: 'anthropic', model: 'claude-opus-4-8' },
  note: { provider: 'google', model: 'gemini-3.1-pro' },
  gate: { provider: 'openai', model: 'gpt-5.5' },
  embed: { provider: 'openai', model: 'text-embedding-3-small' },
  image: { provider: 'google', model: 'gemini-3-pro-image' },
} as const;

export const IMAGES = {
  flagship: { hero: 1, inline: 3 },
  note: { hero: 1, inline: 1 },
};

// Tiered quality gate thresholds (out of 40).
export const GATE = {
  flagship: { min: 34, allowAiTells: 0 },
  note: { min: 30, allowAiTells: 1 },
};

export function loadSources(): SourceConfig[] {
  const p = path.resolve(import.meta.dirname, '../config/sources.yaml');
  const doc = YAML.parse(fs.readFileSync(p, 'utf8')) as { sources?: SourceConfig[] };
  return doc.sources ?? [];
}
