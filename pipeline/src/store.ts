// Durable state: covered-memory (embeddings of published posts), seen item ids,
// and run logs. Replaces the old n8n `staticData`. Swappable backend behind the
// Store interface: JSONFileStore for dev, PostgresStore (pgvector) for production.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
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

// Postgres + pgvector store. Embeddings stored as vector(1536); see db/schema.sql.
export class PostgresStore implements Store {
  private pool: pg.Pool;
  constructor(url: string) {
    this.pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  async loadCovered(): Promise<CoveredEntry[]> {
    const { rows } = await this.pool.query('select slug, title, published_at, embedding::text as embedding from covered');
    return rows.map((r: any) => ({
      slug: r.slug,
      title: r.title,
      publishedAt: new Date(r.published_at).toISOString(),
      vec: JSON.parse(r.embedding) as number[], // pgvector text form "[..]" is valid JSON
    }));
  }
  async addCovered(e: CoveredEntry): Promise<void> {
    if (!Array.isArray(e.vec)) throw new Error('PostgresStore needs dense embeddings — set OPENAI_API_KEY');
    await this.pool.query(
      'insert into covered(slug, title, published_at, embedding) values ($1, $2, $3, $4::vector) on conflict (slug) do nothing',
      [e.slug, e.title, e.publishedAt.slice(0, 10), `[${e.vec.join(',')}]`],
    );
  }
  async filterUnseen(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.pool.query('select id from items where id = any($1)', [ids]);
    const seen = new Set(rows.map((r: any) => r.id));
    return ids.filter((id) => !seen.has(id));
  }
  async markSeen(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.pool.query(
      `insert into items(id) values ${ids.map((_, i) => `($${i + 1})`).join(',')} on conflict (id) do nothing`,
      ids,
    );
  }
  async recordRun(report: unknown): Promise<void> {
    await this.pool.query('insert into runs(started_at, report) values (now(), $1)', [JSON.stringify(report)]);
  }
}

export function getStore(): Store {
  return env.storeBackend === 'postgres' ? new PostgresStore(env.databaseUrl) : new JSONFileStore();
}
