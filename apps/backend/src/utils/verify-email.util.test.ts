import { describe, expect, it } from 'vitest';
import {
  extractDomain,
  isValidEmail,
  normalizeEmails,
} from './verify-email.util';

describe('verify-email.util', () => {
  describe('extractDomain', () => {
    it.each`
      email                    | expected
      ${'user@example.com'}    | ${'example.com'}
      ${'admin@filigran.io'}   | ${'filigran.io'}
      ${'test@sub.domain.org'} | ${'sub.domain.org'}
      ${'user@gmail.com'}      | ${'gmail.com'}
    `('should extract "$expected" from "$email"', ({ email, expected }) => {
      expect(extractDomain(email)).toBe(expected);
    });

    it('should return undefined for email without @', () => {
      expect(extractDomain('invalid')).toBeUndefined();
    });
  });

  describe('isValidEmail', () => {
    it.each`
      email                      | expected
      ${'user@example.com'}      | ${true}
      ${'admin@filigran.io'}     | ${true}
      ${'first.last@domain.org'} | ${true}
      ${'user+tag@example.com'}  | ${true}
    `('should validate "$email" as valid', ({ email, expected }) => {
      expect(isValidEmail(email)).toBe(expected);
    });

    it.each`
      email                 | expected
      ${''}                 | ${false}
      ${'invalid'}          | ${false}
      ${'@domain.com'}      | ${false}
      ${'user@'}            | ${false}
      ${'user@.com'}        | ${false}
      ${'user @domain.com'} | ${false}
    `('should validate "$email" as invalid', ({ email, expected }) => {
      expect(isValidEmail(email)).toBe(expected);
    });
  });

  describe('normalizeEmails', () => {
    it.each([
      { emails: [], expected: [] },
      { emails: [' user@example.com '], expected: ['user@example.com'] },
      {
        emails: ['user@example.com', ' user@example.com '],
        expected: ['user@example.com'],
      },
      { emails: ['', '   ', 'a@example.com'], expected: ['a@example.com'] },
      {
        emails: ['a@example.com', 'b@example.com'],
        expected: ['a@example.com', 'b@example.com'],
      },
    ])('should return $expected when given $emails', ({ emails, expected }) => {
      expect(normalizeEmails(emails)).toEqual(expected);
    });
  });
});
