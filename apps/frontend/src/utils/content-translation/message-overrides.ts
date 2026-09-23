export type Messages = Record<string, unknown>;

export interface MessageOverride {
  key: string;
  value: string;
}

const isMessageGroup = (value: unknown): value is Messages =>
  typeof value === 'object' && value !== null;

// Walks a next-intl dot path through own properties only, so a key naming an
// inherited property (`__proto__`, `constructor`...) or a message group
// instead of a string message never resolves.
const findMessage = (messages: Messages, key: string) => {
  let parent: Messages | null = null;
  let leaf = '';
  let current: unknown = messages;
  for (const segment of key.split('.')) {
    if (!isMessageGroup(current) || !Object.hasOwn(current, segment)) {
      return null;
    }
    parent = current;
    leaf = segment;
    current = current[segment];
  }
  return parent && typeof current === 'string'
    ? { parent, leaf, value: current }
    : null;
};

export const getMessage = (messages: Messages, key: string): string | null =>
  findMessage(messages, key)?.value ?? null;

// Overrides can only replace an existing string message: an unknown key, or
// one that would turn a message into a group, is ignored rather than written.
export const applyMessageOverrides = (
  messages: Messages,
  overrides: MessageOverride[]
): Messages => {
  if (overrides.length === 0) {
    return messages;
  }
  const merged = structuredClone(messages);
  overrides.forEach(({ key, value }) => {
    const message = findMessage(merged, key);
    if (message) {
      message.parent[message.leaf] = value;
    }
  });
  return merged;
};
