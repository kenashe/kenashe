// Durable state: covered-memory (embeddings of published posts), seen item ids,
// and run logs. Replaces the old n8n `staticData`. Swappable backend behind the
// Store interface: JSONFileStore for dev, PostgresStore (pgvector) for production.
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config.ts';
import type { Vec, SparseVec } from './types.ts';

export interface CoveredEntry { slug: string; title: string; publishedAt: string; vec: Vec; }
export interface Store {
  loadCovered(): Promise<CoveredEntry[]>;
  addCovered(e: CoveredEntry): Promise<void>;
  filterUnseen(ids: string[]): Promise<string[]>;
  markSeen(ids: string[]): Promise<void>;
  recordRun(report: unknown): Promise<void>;
}

// Vec (Map) is not JSON-serialisable; (de)hydrate sparse vectors explicitly.
type SerVec = { k: 'sparse'; e: [string, number][] } | { k: 'dense'; v: number[] };
const ser = (v: Vec): SerVec => (v instanceof Map ? { k: 'sparse', e: [...v] } : { k: 'dense', v });
const de = (s: SerVec): Vec => (s.k === 'sparse' ? new Map(s.e) as SparseVec : s.v);

export class JSONFileStore implements Store {
  private file = path.resolve(process.cwd(), env.storeFile);
  private read(): { covered: (Omit<CoveredEntry, 'vec'> & { vec: SerVec })[]; seen: string[]; runs: unknown[] } {
    try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    catch { return { covered: [], seen: [], runs: [] }; }
  }
  private write(d: unknown): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(d, null, 2));
  }
  async loadCovered(): Promise<CoveredEntry[]> {
    return this.read().covered.map((c) => ({ ...c, vec: de(c.vec) }));
  }
  async addCovered(e: CoveredEntry): Promise<void> {
    const d = this.read();
    d.covered.push({ slug: e.slug, title: e.title, publishedAt: e.publishedAt, vec: ser(e.vec) });
    this.write(d);
  }
  async filterUnseen(ids: string[]): Promise<string[]> {
    const seen = new Set(this.read().seen);
    return ids.filter((id) => !seen.has(id));
  }
  async markSeen(ids: string[]): Promise<void> {
    const d = this.read();
    d.seen = [...new Set([...d.seen, ...ids])].slice(-5000);
    this.write(d);
  }
  async recordRun(report: unknown): Promise<void> {
    const d = this.read();
    d.runs.push(report);
    d.runs = d.runs.slice(-200);
    this.write(d);
  }
}

// TODO(prod): implement with `pg` + pgvector. Schema in pipeline/db/schema.sql.
// covered.vec stored as vector(1536); dedup via `ORDER BY vec <=> $1 LIMIT 1`.
export class PostgresStore implements Store {
  constructor(private url: string) {}
  async loadCovered(): Promise<CoveredEntry[]> { throw new Error('PostgresStore: TODO (see db/schema.sql)'); }
  async addCovered(): Promise<void> { throw new Error('PostgresStore: TODO'); }
  async filterUnseen(): Promise<string[]> { throw new Error('PostgresStore: TODO'); }
  async markSeen(): Promise<void> { throw new Error('PostgresStore: TODO'); }
  async recordRun(): Promise<void> { throw new Error('PostgresStore: TODO'); }
}

export function getStore(): Store {
  return env.storeBackend === 'postgres' ? new PostgresStore(env.databaseUrl) : new JSONFileStore();
}
