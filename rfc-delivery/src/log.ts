// One line per step on the terminal and in run.log; one JSON object per event in events.jsonl.
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Logger {
  (message: string): void;
  event(type: string, data?: Record<string, unknown>): void;
  readonly dir: string;
}

const clock = () => new Date().toTimeString().slice(0, 8);

export const createLogger = (dir: string, write: (line: string) => void = (l) => process.stderr.write(`${l}\n`)): Logger => {
  const log = ((message: string) => {
    const line = `${clock()} ${message}`;
    write(line);
    appendFileSync(join(dir, 'run.log'), `${line}\n`);
  }) as Logger;
  log.event = (type, data = {}) =>
    appendFileSync(join(dir, 'events.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), type, ...data })}\n`);
  Object.defineProperty(log, 'dir', { value: dir });
  return log;
};

/** Thrown to stop the run with a message for the human: the CLI prints it and exits 1. */
export class Stop extends Error {}
