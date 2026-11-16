// Unattended Claude Code sessions through the Agent SDK: one per mode of WORKFLOW.md, in the
// worktree, with the trusted checkout's configuration, the permission policy of policy.ts and a
// structured result.
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { query, type CanUseTool, type SDKMessage, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Config } from './config.ts';
import { networkUp, waitForNetwork } from './github.ts';
import type { Logger } from './log.ts';
import { decide, type Mode, type PolicyContext } from './policy.ts';

// ---------------------------------------------------------------- results

export type SessionStatus = 'DONE' | 'NEEDS_HUMAN' | 'FAILED' | 'FLAKY';

export interface SpecOutput {
  status: Exclude<SessionStatus, 'FLAKY'>;
  summary: string;
  question?: string;
}

export interface ItemOutput {
  status: SessionStatus;
  summary: string;
  commit_subject: string;
  commit_body: string;
  pr_summary: string;
  how_to_test: string;
  question?: string;
}

export interface ReviewOutput {
  findings: string;
}

const object = (required: string[], properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
});
const text = { type: 'string' };

export const SCHEMAS = {
  spec: object(['status', 'summary'], { status: { type: 'string', enum: ['DONE', 'NEEDS_HUMAN', 'FAILED'] }, summary: text, question: text }),
  item: object(['status', 'summary', 'commit_subject', 'commit_body', 'pr_summary', 'how_to_test'], {
    status: { type: 'string', enum: ['DONE', 'NEEDS_HUMAN', 'FAILED'] },
    summary: text,
    commit_subject: text,
    commit_body: text,
    pr_summary: text,
    how_to_test: text,
    question: text,
  }),
  ci: object(['status', 'summary', 'commit_subject', 'commit_body', 'pr_summary', 'how_to_test'], {
    status: { type: 'string', enum: ['DONE', 'NEEDS_HUMAN', 'FAILED', 'FLAKY'] },
    summary: text,
    commit_subject: text,
    commit_body: text,
    pr_summary: text,
    how_to_test: text,
    question: text,
  }),
  review: object(['findings'], { findings: text }),
} as const;

export const failed = (summary: string): ItemOutput => ({
  status: 'FAILED',
  summary,
  commit_subject: '',
  commit_body: '',
  pr_summary: '',
  how_to_test: '',
});

export interface SessionRequest {
  /** Log and transcript name: `<chunk>-spec`, `<chunk>-build-mode`, `rfc-review`. */
  name: string;
  prompt: string;
  schema: Record<string, unknown>;
  mode: Mode;
}

export interface SessionResult<T> {
  output?: T;
  costUsd: number;
  sessionId?: string;
  error?: string;
}

// ---------------------------------------------------------------- progress

const oneLine = (value: unknown, max: number): string => String(value ?? '').replace(/\s+/g, ' ').slice(0, max);

/** The lines a message adds to the run log: tool calls (indented in a subagent) and the main thread's text. */
export const progressLines = (message: SDKMessage): string[] => {
  if (message.type !== 'assistant') return [];
  const sub = message.parent_tool_use_id !== null;
  const lines: string[] = [];
  for (const block of message.message.content) {
    if (block.type === 'tool_use' && block.name !== 'StructuredOutput') {
      const input = block.input as Record<string, unknown>;
      const detail = input.command ?? input.file_path ?? input.pattern ?? input.skill ?? input.description ?? '';
      lines.push(`${sub ? '    ' : '  '}${block.name} ${oneLine(detail, 140)}`);
    } else if (block.type === 'text' && !sub && block.text.trim()) {
      lines.push(`  > ${oneLine(block.text, 200)}`);
    }
  }
  return lines;
};

const API_LOST = /API Error|ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|socket hang up|Connection error|Overloaded|overloaded_error/;

const resultError = (result: SDKResultMessage): string | undefined => {
  if (result.subtype === 'success') return result.is_error ? result.result : undefined;
  return [result.subtype, ...result.errors].join(': ');
};

// ---------------------------------------------------------------- runner

export class Sessions {
  private readonly cfg: Config;
  private readonly log: Logger;
  private readonly abort: AbortController;

  constructor(cfg: Config, log: Logger, abort: AbortController) {
    this.cfg = cfg;
    this.log = log;
    this.abort = abort;
  }

  policy(mode: Mode): PolicyContext {
    return { mode, worktree: this.cfg.worktree, toolDir: this.cfg.toolDir, dir: this.cfg.dir, flowDir: this.cfg.flowDir, privateDir: this.cfg.privateDir };
  }

  private canUseTool(name: string, mode: Mode): CanUseTool {
    const ctx = this.policy(mode);
    return async (tool, input) => {
      const decision = decide(ctx, tool, input);
      if (decision.allow) return { behavior: 'allow', updatedInput: input };
      this.log.event('denied', { session: name, tool, input, message: decision.message });
      return { behavior: 'deny', message: decision.message };
    };
  }

  /** Runs one session to its structured result. Resumes it when the API drops, at most three times. */
  async run<T>(request: SessionRequest): Promise<SessionResult<T>> {
    const transcript = join(this.cfg.logDir, `${request.name}.jsonl`);
    let prompt = request.prompt;
    let resume: string | undefined;
    let cost = 0;
    for (let attempt = 1; ; attempt++) {
      const result = await this.once<T>(request, prompt, resume, transcript);
      cost += result.costUsd;
      const lost = result.error !== undefined && API_LOST.test(result.error) && !(await networkUp());
      this.log(`${request.name}: $${cost.toFixed(2)}${result.sessionId ? `, resume with: claude --resume ${result.sessionId}` : ''}`);
      if (!lost || attempt >= 4 || !result.sessionId) return { ...result, costUsd: cost };
      if (!(await waitForNetwork(this.log, undefined, this.abort.signal))) return { ...result, costUsd: cost };
      resume = result.sessionId;
      prompt = 'The connection to the API dropped while you were working. Continue the task from where you stopped, then return the structured result.';
      this.log(`${request.name}: the API was out of reach, resuming the session (attempt ${attempt + 1} of 4)`);
    }
  }

  private async once<T>(request: SessionRequest, prompt: string, resume: string | undefined, transcript: string): Promise<SessionResult<T>> {
    const abort = new AbortController();
    const onAbort = () => abort.abort();
    this.abort.signal.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => abort.abort(new Error('session timeout')), this.cfg.sessionTimeoutMs);
    let result: SDKResultMessage | undefined;
    let sessionId: string | undefined;
    try {
      const messages = query({
        prompt,
        options: {
          cwd: this.cfg.worktree,
          // The tracking folder (specs), the Flow checkout (the RFC) and the tooling (WORKFLOW.md, cli.mjs).
          additionalDirectories: [this.cfg.dir, this.cfg.flowDir, this.cfg.toolDir],
          // Settings, CLAUDE.md, rules, agents and skills come from the trusted checkout, not from the branch.
          projectConfigRoot: this.cfg.repoRoot,
          settingSources: ['project'],
          skills: 'all',
          // Every call the project settings do not allow goes through the policy (no bare allowedTools,
          // which would bypass it).
          permissionMode: 'default',
          canUseTool: this.canUseTool(request.name, request.mode),
          outputFormat: { type: 'json_schema', schema: request.schema },
          ...(this.cfg.model ? { model: this.cfg.model } : {}),
          ...(this.cfg.budgetUsd ? { maxBudgetUsd: this.cfg.budgetUsd } : {}),
          ...(resume ? { resume } : {}),
          title: `${this.cfg.rfc} ${request.name}`,
          abortController: abort,
          env: { ...process.env, CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: '1', CLAUDE_AGENT_SDK_CLIENT_APP: 'xtm-hub-rfc-delivery' },
          stderr: (data) => appendFileSync(join(this.cfg.logDir, `${request.name}.stderr`), data),
        },
      });
      for await (const message of messages) {
        appendFileSync(transcript, `${JSON.stringify(message)}\n`);
        sessionId ??= 'session_id' in message ? message.session_id : undefined;
        for (const line of progressLines(message)) this.log(`${request.name}${line}`);
        if (message.type === 'result') result = message;
      }
    } catch (error) {
      return { costUsd: 0, sessionId, error: (error as Error).message };
    } finally {
      clearTimeout(timer);
      this.abort.signal.removeEventListener('abort', onAbort);
    }
    if (!result) return { costUsd: 0, sessionId, error: 'the session ended without a result' };
    this.log.event('session', {
      name: request.name,
      subtype: result.subtype,
      cost: result.total_cost_usd,
      turns: result.num_turns,
      denials: result.permission_denials.length,
    });
    const error = resultError(result);
    const output = result.subtype === 'success' ? (result.structured_output as T | undefined) : undefined;
    return { output, costUsd: result.total_cost_usd, sessionId: result.session_id, ...(error ? { error } : {}) };
  }
}
