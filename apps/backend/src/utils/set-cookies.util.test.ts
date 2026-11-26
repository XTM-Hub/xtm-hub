import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { setCookieError } from './set-cookies.util';

const FLASH_COOKIE = 'opencti_flash';
const ERROR_MESSAGE = 'Platform registration failed';

const buildResponse = () => {
  const cookie = vi.fn();
  return { res: { cookie } as unknown as Response, cookie };
};

describe('setCookieError', () => {
  it.each([
    [ERROR_MESSAGE, 'a message is given', ERROR_MESSAGE],
    ['Unknown error', 'no message is given', undefined],
    ['Unknown error', 'the message is empty', ''],
  ])(
    'should set the flash cookie to "%s" when %s',
    (expected, _label, message) => {
      // Given
      const { res, cookie } = buildResponse();

      // When
      setCookieError(res, message);

      // Then
      expect(cookie).toHaveBeenCalledWith(
        FLASH_COOKIE,
        expected,
        expect.any(Object)
      );
    }
  );

  it('should make the flash cookie short-lived, secure and readable by the browser', () => {
    // Given
    const { res, cookie } = buildResponse();

    // When
    setCookieError(res, ERROR_MESSAGE);

    // Then
    expect(cookie).toHaveBeenCalledWith(FLASH_COOKIE, ERROR_MESSAGE, {
      maxAge: 5000,
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
    });
  });
});
