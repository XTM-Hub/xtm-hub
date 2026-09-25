// A key is a dot path into next-intl's nested messages, which the frontend
// walks segment by segment: prototype-bearing names must never reach it.
const FORBIDDEN_KEY_SEGMENTS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);
const KEY_SEGMENT_PATTERN = /^\w[\w -]*$/;
const MAX_KEY_LENGTH = 255;

export const isValidContentTranslationKey = (key: string): boolean =>
  key.length <= MAX_KEY_LENGTH &&
  key
    .split('.')
    .every(
      (segment) =>
        KEY_SEGMENT_PATTERN.test(segment) &&
        !FORBIDDEN_KEY_SEGMENTS.has(segment)
    );
