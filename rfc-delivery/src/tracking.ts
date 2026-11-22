// The tracking folder of one RFC: chunks.yaml (the plan, read only) and rfc-status.yaml (the
// state, written here only), through the deterministic layer in lib/state.mjs.
import { existsSync, readFileSync } from 'node:fs';
import * as st from '../lib/state.mjs';
import { Stop } from './log.ts';

export type ChunkStatus = 'backlog' | 'ready-for-dev' | 'in-progress' | 'review' | 'done' | 'merged' | 'blocked' | 'external';
export type RfcStatus = 'planning' | 'in-progress' | 'review' | 'done';

export interface Chunk {
  id: string;
  slice: string;
  type?: string;
  scope?: string;
  title: string;
  acceptance?: string[];
  tests?: string[];
  depends_on?: string[];
  spec_checkpoint?: boolean;
  repository?: string;
  description?: string;
  invoke_dev_with?: string;
}

export interface ChunkFacts {
  issue?: number | string;
  branch?: string;
  pull_request?: number | string;
}

export interface Plan {
  rfc: string;
  chunks: Chunk[];
  skipped_slices?: Record<string, string>;
}

export interface Status {
  rfc: string;
  title?: string;
  public_title?: string;
  source: { repository: string; branch: string; path: string; sha: string };
  repository: string;
  base: string;
  branch?: string;
  rfc_issue?: number | string;
  pull_request?: number | string;
  private_repository: string;
  private_branch: string;
  private_pull_request?: number | string;
  required_checks: string;
  github_project?: string;
  project_statuses?: string;
  labels?: string;
  rfc_status?: RfcStatus;
  development_status?: Record<string, ChunkStatus | string>;
  chunks?: Record<string, ChunkFacts>;
}

export type NextAction =
  | { action: 'approve' | 'end' | 'hold' | 'gate' }
  | { action: 'ci' | 'run' | 'wait' | 'hold-spec'; chunk: string }
  | { action: 'stuck'; chunk: string; detail: string };

/** A value the delivery has not set yet. */
export const none = (value: unknown): value is undefined | null | '' | 'none' =>
  value === undefined || value === null || value === '' || value === 'none';

export const str = (value: unknown): string => (none(value) ? '' : String(value));

export class Tracking {
  readonly dir: string;

  constructor(dir: string) {
    this.dir = dir;
    if (!existsSync(st.paths(dir).plan)) throw new Stop(`no plan: ${st.paths(dir).plan} (run the start-rfc skill first)`);
  }

  plan(): Plan {
    return st.loadPlan(this.dir) as Plan;
  }

  status(): Status {
    return st.loadStatus(this.dir) as Status;
  }

  /** The chunks this repository builds, in stack order, with their status. */
  chunks(): { chunk: Chunk; status: ChunkStatus }[] {
    const plan = this.plan();
    const status = this.status();
    return (st.ourChunks(plan, status) as Chunk[]).map((chunk) => ({
      chunk,
      status: (status.development_status?.[chunk.id] ?? 'backlog') as ChunkStatus,
    }));
  }

  chunk(id: string): Chunk {
    const chunk = this.plan().chunks.find((c) => c.id === id);
    if (!chunk) throw new Error(`no chunk ${id} in ${this.dir}`);
    return chunk;
  }

  statusOf(id: string): ChunkStatus {
    return (this.status().development_status?.[id] ?? 'backlog') as ChunkStatus;
  }

  facts(id: string): ChunkFacts {
    return this.status().chunks?.[id] ?? {};
  }

  /** Sets a chunk's status and recomputes the status of every slice. */
  setStatus(id: string, value: ChunkStatus): void {
    const plan = this.plan();
    this.chunk(id);
    const doc = st.loadStatusDoc(this.dir);
    doc.setIn(['development_status', id], value);
    const status = doc.toJS();
    for (const slice of new Set(plan.chunks.map((c) => c.slice)))
      doc.setIn(['development_status', st.sliceKey(slice)], st.sliceStatus(plan, status, slice));
    st.saveStatusDoc(this.dir, doc);
  }

  setFact(id: string, key: keyof ChunkFacts, value: string | number): void {
    this.setField(['chunks', id, key], value);
  }

  setField(path: string | string[], value: string | number): void {
    const keys = typeof path === 'string' ? path.split('.') : path;
    if (keys[0] === 'rfc_status' && !st.RFC_STATUSES.includes(String(value))) throw new Error(`unknown rfc_status ${value}`);
    const doc = st.loadStatusDoc(this.dir);
    doc.setIn(keys, value);
    st.saveStatusDoc(this.dir, doc);
  }

  next(waiting: string[] = []): NextAction {
    const specApproved = (id: string) => {
      const fm = st.specFrontmatter(this.dir, id) as { approved_by?: string } | null;
      return Boolean(fm && !none(fm.approved_by));
    };
    // lib/state.mjs is plain JS: its defaults (an empty array, a no-argument function) are all tsc infers.
    return st.next(this.plan(), this.status(), { waiting, specApproved } as never) as NextAction;
  }

  /** The branch a chunk stacks on: the nearest earlier unmerged chunk branch, else the RFC branch. */
  base(id: string): string {
    return st.stackBase(this.plan(), this.status(), id) as string;
  }

  above(id: string): Chunk[] {
    return st.above(this.plan(), this.status(), id) as Chunk[];
  }

  /** `type(scope): title (#issue)`: the chunk's issue title, and its pull request title once it has an issue. */
  title(id: string): string {
    return st.chunkTitle(this.chunk(id), this.facts(id).issue) as string;
  }

  position(id: string): { position: number; of: number } {
    const mine = this.chunks();
    return { position: mine.findIndex((c) => c.chunk.id === id) + 1, of: mine.length };
  }

  validate(): { errors: string[]; warnings: string[] } {
    return st.validate(this.plan(), this.status()) as { errors: string[]; warnings: string[] };
  }

  specPath(id: string): string {
    return st.paths(this.dir).spec(id) as string;
  }

  specText(id: string): string | null {
    const file = this.specPath(id);
    return existsSync(file) ? readFileSync(file, 'utf8') : null;
  }

  checkSpec(id: string): { errors: string[]; warnings: string[] } {
    const text = this.specText(id);
    if (text === null) return { errors: [`no spec at ${this.specPath(id)}`], warnings: [] };
    return st.checkSpec(text, this.chunk(id), this.status()) as { errors: string[]; warnings: string[] };
  }

  /** The screens a spec declares, from its `## Screens` JSON block. */
  screens(id: string): unknown[] {
    const match = this.specText(id)?.match(/^## Screens\n[\s\S]*?```json\n([\s\S]*?)\n```/m);
    if (!match?.[1]) return [];
    try {
      const value: unknown = JSON.parse(match[1]);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  publicPrBody(): string {
    return st.publicPrBody(this.plan(), this.status()) as string;
  }

  privatePrBody(): string {
    const sections = (id: string) => {
      const text = this.specText(id);
      return text === null ? {} : st.bulletsBySection(text);
    };
    return st.privatePrBody(this.plan(), this.status(), sections as never) as string;
  }
}
