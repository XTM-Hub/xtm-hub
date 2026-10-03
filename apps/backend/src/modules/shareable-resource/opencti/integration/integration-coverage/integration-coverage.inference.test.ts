import { describe, expect, it } from 'vitest';
import {
  COVERAGE_KEYWORD_RULES,
  inferIntegrationCoverage,
  KNOWN_OBJECT_TYPES,
  OBJECT_TYPE_KEYWORD_RULES,
} from './integration-coverage.inference';
import { COVERAGE_FAMILIES } from './integration-coverage.model';

describe('integration-coverage.inference', () => {
  describe('inferIntegrationCoverage object types', () => {
    it.each([
      ['a vulnerability feed', 'Vulnerability feed', ['Vulnerability']],
      ['CVE identifiers', 'Imports CVEs and CVSS scores', ['Vulnerability']],
      ['IOC wording', 'Daily IOC export', ['Indicator']],
      ['indicator wording', 'Pushes indicators of compromise', ['Indicator']],
      ['detection rules', 'Imports YARA rules', ['Indicator']],
      ['malware', 'Malware family tracking', ['Malware']],
      [
        'phishing',
        'Phishing kit tracker',
        ['Url', 'Domain-Name', 'Email-Addr'],
      ],
      ['ransomware', 'Ransomware leak sites', ['Malware', 'Intrusion-Set']],
      ['MITRE ATT&CK', 'Maps to MITRE ATT&CK', ['Attack-Pattern']],
      ['TTPs', 'Adversary TTPs', ['Attack-Pattern', 'Intrusion-Set']],
      ['reports', 'Threat intelligence reports', ['Report']],
      ['uppercase IP', 'Malicious IP list', ['IPv4-Addr']],
      ['IPv6', 'IPv6 blocklist', ['Indicator', 'IPv6-Addr']],
      ['nothing relevant', 'A generic connector', []],
    ])(
      'should infer %s',
      (_description, shortDescription, expectedObjectTypes) => {
        // Given
        const source = { short_description: shortDescription };

        // When
        const coverage = inferIntegrationCoverage(source);

        // Then
        expect(coverage.object_types).toEqual(expectedObjectTypes);
      }
    );

    it.each([
      ['lowercase "ip" inside a word', 'Ship tracking and multiple tips'],
      ['IPS (intrusion prevention)', 'Integrates with your IPS appliance'],
      ['"http" inside a word', 'Use HTTPS everywhere'],
      ['"rate" containing RAT', 'Rate limited RATE endpoint'],
    ])(
      'should not infer any object type from %s',
      (_description, shortDescription) => {
        // Given
        const source = { short_description: shortDescription };

        // When
        const coverage = inferIntegrationCoverage(source);

        // Then
        expect(coverage.object_types).toEqual([]);
      }
    );

    it('should ignore keywords that only appear inside URLs', () => {
      // Given
      const source = {
        description:
          'See https://example.com/reports/malware/ip for the documentation',
      };

      // When
      const coverage = inferIntegrationCoverage(source);

      // Then
      expect(coverage.object_types).toEqual([]);
    });

    it('should infer from use cases and solution categories', () => {
      // Given
      const source = {
        name: 'Acme',
        use_cases: ['Vulnerability management'],
        solution_categories: ['Threat Intelligence Feed'],
      };

      // When
      const coverage = inferIntegrationCoverage(source);

      // Then
      expect(coverage.object_types).toEqual(['Vulnerability']);
    });

    it('should return each value once, in rule order', () => {
      // Given
      const source = {
        name: 'Malware and ransomware feed',
        description: 'Malware IOCs, malware samples',
      };

      // When
      const coverage = inferIntegrationCoverage(source);

      // Then
      expect(coverage.object_types).toEqual([
        'Indicator',
        'Malware',
        'Intrusion-Set',
      ]);
    });
  });

  describe('inferIntegrationCoverage sectors and regions', () => {
    it.each([
      ['banking', 'Fraud signals for banks', ['Finance']],
      ['healthcare', 'Health care and hospitals', ['Healthcare']],
      ['ICS', 'ICS and SCADA monitoring', ['Industrial']],
      ['financially (no match)', 'Financially motivated actors', []],
    ])('should infer the sector for %s', (_description, text, expected) => {
      // Given
      const source = { description: text };

      // When
      const coverage = inferIntegrationCoverage(source);

      // Then
      expect(coverage.sectors).toEqual(expected);
    });

    it.each([
      ['worldwide', 'Worldwide sensor network', ['Global']],
      ['a national CERT', 'Advisories from CERT-FR', ['France']],
      ['the EU acronym', 'EU institutions', ['Europe']],
      ['a lowercase "us"', 'Contact us for more', []],
      ['"global" alone', 'Global search integration', []],
    ])('should infer the region for %s', (_description, text, expected) => {
      // Given
      const source = { description: text };

      // When
      const coverage = inferIntegrationCoverage(source);

      // Then
      expect(coverage.regions).toEqual(expected);
    });
  });

  describe('keyword table', () => {
    it('should keep every pattern free of the stateful global flag', () => {
      // Given
      const allRules = COVERAGE_FAMILIES.flatMap(
        (family) => COVERAGE_KEYWORD_RULES[family]
      );

      // When
      const globalPatterns = allRules
        .filter((rule) => rule.pattern.flags.includes('g'))
        .map((rule) => rule.pattern.source);

      // Then
      expect(globalPatterns).toEqual([]);
    });

    it('should only produce known OpenCTI entity types', () => {
      // Given
      const knownTypes = new Set(KNOWN_OBJECT_TYPES);

      // When
      const unknownTypes = OBJECT_TYPE_KEYWORD_RULES.flatMap(
        (rule) => rule.values
      ).filter((value) => !knownTypes.has(value));

      // Then
      expect(unknownTypes).toEqual([]);
    });

    it('should give the same result for the same input', () => {
      // Given
      const source = { description: 'Phishing URLs and malware IOCs' };

      // When
      const first = inferIntegrationCoverage(source);
      const second = inferIntegrationCoverage(source);

      // Then
      expect(second).toEqual(first);
    });
  });
});
