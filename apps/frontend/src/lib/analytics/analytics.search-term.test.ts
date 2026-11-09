import { maskSearchTerm } from '@/lib/analytics/analytics.search-term';
import { describe, expect, it } from 'vitest';

const MD5 = 'd41d8cd98f00b204e9800998ecf8427e';
const SHA1 = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';
const SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SHA512 = 'cf83e1357eefb8bdf1542850d66d8007'.repeat(4);

describe('maskSearchTerm', () => {
  it.each([
    ['https://evil.example.com/payload?id=1', '[url]'],
    ['8.8.8.8', '[ip]'],
    ['10.0.0.0/8', '[ip]'],
    ['192.168.1.10:8080', '[ip]'],
    ['2001:db8::1', '[ip]'],
    ['[2001:db8::1]:443', '[ip]'],
    ['3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b', '[uuid]'],
    [MD5, '[hash]'],
    [SHA1, '[hash]'],
    [SHA256, '[hash]'],
    [SHA512, '[hash]'],
    ['dGhpcyBpcyBhIHNlY3JldCB0b2tlbg==', '[token]'],
    ['evil.example.com', '[domain]'],
    ['evil.example.com:8443/login', '[domain]'],
    ['123456', '[number]'],
    ['(8.8.8.8),', '[ip]'],
    ['evil[.]example[.]com', '[domain]'],
    ['1.2.3[.]4', '[ip]'],
    ['phishing campaign', 'phishing campaign'],
    ['CVE-2024-3400', 'CVE-2024-3400'],
    ['12345', '12345'],
    ['living-off-the-land-binaries', 'living-off-the-land-binaries'],
    ['cve 8.8.8.8 evil.example.com', 'cve [ip] [domain]'],
  ])(
    'should send "%s" as "%s" when it is searched',
    (searchTerm, maskedSearchTerm) => {
      // Given / When
      const result = maskSearchTerm(searchTerm);

      // Then
      expect(result).toBe(maskedSearchTerm);
    }
  );
});
