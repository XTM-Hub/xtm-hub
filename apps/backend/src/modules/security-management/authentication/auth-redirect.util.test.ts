import { describe, expect, it, vi } from 'vitest';
import { logApp } from '../../../utils/app-logger.util';
import { resolveSafeRedirect } from './auth-redirect.util';

vi.spyOn(logApp, 'warn').mockImplementation(() => {});
vi.spyOn(logApp, 'error').mockImplementation(() => {});

describe('resolveSafeRedirect', () => {
  describe('accepted values', () => {
    it.each`
      path                                   | expected
      ${'/app'}                              | ${'/app'}
      ${'/app/service/opencti_integrations'} | ${'/app/service/opencti_integrations'}
      ${'/app/manage?tab=members'}           | ${'/app/manage?tab=members'}
      ${'/'}                                 | ${'/'}
      ${'/%5cevil.test'}                     | ${'/%5cevil.test'}
    `('should keep same-site path "$path"', ({ path, expected }) => {
      expect(resolveSafeRedirect(btoa(path))).toBe(expected);
    });
  });

  describe('rejected values', () => {
    it.each`
      path                       | description
      ${'https://evil.test'}     | ${'absolute url'}
      ${'//evil.test'}           | ${'protocol-relative url'}
      ${'/\\evil.test'}          | ${'backslash normalised to a new origin'}
      ${'/\\\\evil.test'}        | ${'double backslash'}
      ${'\\\\evil.test'}         | ${'leading double backslash'}
      ${'javascript:alert(1)'}   | ${'javascript scheme'}
      ${'/app\r\nSet-Cookie: a'} | ${'CRLF response splitting'}
      ${'/app\u0000'}            | ${'NUL byte'}
      ${'/app\tx'}               | ${'tab control character'}
      ${'evil.test/path'}        | ${'schemeless host'}
    `('should reject $description', ({ path }) => {
      expect(resolveSafeRedirect(btoa(path))).toBeUndefined();
    });
  });

  describe('non-string query params', () => {
    it.each`
      redirect                      | description
      ${undefined}                  | ${'missing param'}
      ${['/app', '/other']}         | ${'repeated param exposed as an array'}
      ${{ evil: 'https://x.test' }} | ${'bracket syntax exposed as an object'}
      ${42}                         | ${'numeric value'}
      ${''}                         | ${'empty string'}
    `('should return undefined for $description', ({ redirect }) => {
      expect(resolveSafeRedirect(redirect)).toBeUndefined();
    });
  });
});
