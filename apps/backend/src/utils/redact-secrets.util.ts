export const REDACTED_VALUE = '[REDACTED]';

// Matches the names of values that must never reach a log line: platform and user tokens, passwords, client secrets.
const SECRET_KEY_PATTERN = /token|password|secret/i;

/**
 * Returns a copy of the value where every property whose name looks like a secret is replaced by `REDACTED_VALUE`,
 * at any depth, so GraphQL variables such as `input.token` or `input.tenants[].token` can be logged safely.
 */
export const redactSecrets = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactSecrets);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? REDACTED_VALUE : redactSecrets(entry),
    ])
  );
};
