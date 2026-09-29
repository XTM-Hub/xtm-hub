import { describe, expect, it } from 'vitest';
import {
  applyMessageOverrides,
  getMessage,
  Messages,
} from './message-overrides';

const TITLE_KEY = 'PublicHomePage.XtmPlatform.Title';
const COMMITTED_TITLE = 'Extend and scale your XTM Platform';
const EDITED_TITLE = 'Scale your XTM Platform';

const makeMessages = (): Messages => ({
  PublicHomePage: { XtmPlatform: { Title: COMMITTED_TITLE } },
});

describe('applyMessageOverrides', () => {
  it('should replace the message when the override key is an existing string message', () => {
    // Given
    const messages = makeMessages();

    // When
    const merged = applyMessageOverrides(messages, [
      { key: TITLE_KEY, value: EDITED_TITLE },
    ]);

    // Then
    expect(getMessage(merged, TITLE_KEY)).toBe(EDITED_TITLE);
  });

  it('should leave the committed messages untouched when applying overrides', () => {
    // Given
    const messages = makeMessages();

    // When
    applyMessageOverrides(messages, [{ key: TITLE_KEY, value: EDITED_TITLE }]);

    // Then
    expect(getMessage(messages, TITLE_KEY)).toBe(COMMITTED_TITLE);
  });

  it.each([
    ['__proto__.polluted'],
    ['constructor.prototype.polluted'],
    ['PublicHomePage.__proto__.polluted'],
  ])(
    'should not pollute the Object prototype when the override key is %s',
    (key) => {
      // Given
      const messages = makeMessages();

      // When
      applyMessageOverrides(messages, [{ key, value: 'polluted' }]);

      // Then
      expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    }
  );

  it.each([
    ['a key under a string message', `${TITLE_KEY}.Nested`],
    ['a key naming a message group', 'PublicHomePage.XtmPlatform'],
    ['an unknown key', 'PublicHomePage.Unknown'],
    ['an empty key', ''],
  ])('should ignore the override when it targets %s', (_label, key) => {
    // Given
    const messages = makeMessages();

    // When
    const merged = applyMessageOverrides(messages, [
      { key, value: EDITED_TITLE },
    ]);

    // Then
    expect(merged).toEqual(makeMessages());
  });
});

describe('getMessage', () => {
  it.each([
    [TITLE_KEY, COMMITTED_TITLE],
    ['PublicHomePage.XtmPlatform', null],
    ['PublicHomePage.Unknown', null],
    ['constructor.name', null],
    ['PublicHomePage.toString', null],
  ])('should resolve %s to %s', (key, expected) => {
    // Given
    const messages = makeMessages();

    // When
    const message = getMessage(messages, key);

    // Then
    expect(message).toBe(expected);
  });
});
