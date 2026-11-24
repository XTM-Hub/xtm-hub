import {
  buildMetaDescription,
  buildResourceMetaDescription,
  MetaDescriptionErrorCode,
  validateMetaDescription,
} from '@/utils/shareable-resources/meta-description.utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { describe, expect, it } from 'vitest';

const PRODUCT = 'OpenCTI';
const TYPE_LABEL = 'Dashboard';
const SUMMARY = 'Ransomware campaigns at a glance';
const TITLE = 'Ransomware overview';
// "OpenCTI Dashboard: " then the summary, then the period the formula appends.
const DASHBOARD_PREFIX = 'OpenCTI Dashboard: ';
const DASHBOARD_OVERHEAD = DASHBOARD_PREFIX.length + '.'.length;

/** A dashboard summary whose generated meta-description has exactly `length` characters. */
const dashboardSummaryOfLength = (length: number) =>
  'a'.repeat(length - DASHBOARD_OVERHEAD);

describe('buildMetaDescription', () => {
  it.each([
    {
      context: 'the summary has no final period',
      summary: SUMMARY,
      expected: `OpenCTI Dashboard: ${SUMMARY}.`,
    },
    {
      context: 'the summary already ends with a period',
      summary: `${SUMMARY}.`,
      expected: `OpenCTI Dashboard: ${SUMMARY}.`,
    },
    {
      context: 'the summary is surrounded by blanks',
      summary: `  ${SUMMARY}.  `,
      expected: `OpenCTI Dashboard: ${SUMMARY}.`,
    },
  ])('should return "$expected" when $context', ({ summary, expected }) => {
    // Given / When
    const metaDescription = buildMetaDescription({
      product: PRODUCT,
      typeLabel: TYPE_LABEL,
      summary,
    });

    // Then
    expect(metaDescription).toBe(expected);
  });
});

describe('buildResourceMetaDescription', () => {
  it.each([
    {
      resourceType: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      expected: `OpenCTI Dashboard: ${SUMMARY}.`,
    },
    {
      resourceType: ShareableResourceType.OPENCTI_CUSTOM_VIEW,
      expected: `OpenCTI Custom View: ${SUMMARY}.`,
    },
    {
      resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
      expected: `OpenCTI Integration: ${SUMMARY}.`,
    },
    {
      resourceType: ShareableResourceType.OPENCTI_PLAYBOOK,
      expected: `OpenCTI Playbook: ${SUMMARY}.`,
    },
    {
      resourceType: ShareableResourceType.OPENAEV_SCENARIO,
      expected: `OpenAEV Scenario: ${SUMMARY}.`,
    },
  ])(
    'should return "$expected" for a $resourceType',
    ({ resourceType, expected }) => {
      // Given / When
      const metaDescription = buildResourceMetaDescription(
        resourceType,
        SUMMARY
      );

      // Then
      expect(metaDescription).toBe(expected);
    }
  );
});

describe('validateMetaDescription', () => {
  it.each([
    {
      context: 'the generated text has 120 characters',
      summary: dashboardSummaryOfLength(120),
      title: TITLE,
    },
    {
      context: 'the generated text has 160 characters',
      summary: dashboardSummaryOfLength(160),
      title: TITLE,
    },
    {
      context: 'the summary only uses plain hyphens',
      summary: `${dashboardSummaryOfLength(140)} - APT-28`,
      title: TITLE,
    },
    {
      context: 'the title only appears after the start',
      summary: `${dashboardSummaryOfLength(140)} ${TITLE}`,
      title: TITLE,
    },
    {
      context: 'the title is blank',
      summary: dashboardSummaryOfLength(140),
      title: '   ',
    },
  ])('should accept the summary when $context', ({ summary, title }) => {
    // Given / When
    const error = validateMetaDescription({
      resourceType: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
      summary,
      title,
    });

    // Then
    expect(error).toBeNull();
  });

  it.each([
    {
      context: 'the summary is empty',
      summary: '',
      title: TITLE,
      expected: MetaDescriptionErrorCode.REQUIRED,
    },
    {
      context: 'the summary is blank',
      summary: '   ',
      title: TITLE,
      expected: MetaDescriptionErrorCode.REQUIRED,
    },
    {
      context: 'the generated text has 119 characters',
      summary: dashboardSummaryOfLength(119),
      title: TITLE,
      expected: MetaDescriptionErrorCode.TOO_SHORT,
    },
    {
      context:
        'the summary ends with its own period and the generated text has 119 characters',
      summary: `${dashboardSummaryOfLength(119)}.`,
      title: TITLE,
      expected: MetaDescriptionErrorCode.TOO_SHORT,
    },
    {
      context: 'the generated text has 161 characters',
      summary: dashboardSummaryOfLength(161),
      title: TITLE,
      expected: MetaDescriptionErrorCode.TOO_LONG,
    },
    {
      context: 'the summary holds an em dash',
      summary: `${dashboardSummaryOfLength(140)} — APT-28`,
      title: TITLE,
      expected: MetaDescriptionErrorCode.INVALID_DASH,
    },
    {
      context: 'the summary holds an en dash',
      summary: `${dashboardSummaryOfLength(140)} – APT-28`,
      title: TITLE,
      expected: MetaDescriptionErrorCode.INVALID_DASH,
    },
    {
      context: 'the generated text equals the title',
      summary: dashboardSummaryOfLength(140),
      title: `${DASHBOARD_PREFIX}${dashboardSummaryOfLength(140)}.`,
      expected: MetaDescriptionErrorCode.MATCHES_TITLE,
    },
    {
      context: 'the generated text starts with the title',
      summary: dashboardSummaryOfLength(140),
      title: 'OpenCTI Dashboard',
      expected: MetaDescriptionErrorCode.MATCHES_TITLE,
    },
    {
      context:
        'the generated text starts with the title in another case, surrounded by blanks',
      summary: dashboardSummaryOfLength(140),
      title: '  opencti DASHBOARD: aaa  ',
      expected: MetaDescriptionErrorCode.MATCHES_TITLE,
    },
  ])(
    'should return $expected when $context',
    ({ summary, title, expected }) => {
      // Given / When
      const error = validateMetaDescription({
        resourceType: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
        summary,
        title,
      });

      // Then
      expect(error).toBe(expected);
    }
  );

  it.each([
    {
      resourceType: ShareableResourceType.OPENAEV_SCENARIO,
      summaryLength: 101,
      expected: null,
    },
    {
      resourceType: ShareableResourceType.OPENAEV_SCENARIO,
      summaryLength: 100,
      expected: MetaDescriptionErrorCode.TOO_SHORT,
    },
    {
      resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
      summaryLength: 138,
      expected: null,
    },
    {
      resourceType: ShareableResourceType.OPENCTI_INTEGRATION,
      summaryLength: 139,
      expected: MetaDescriptionErrorCode.TOO_LONG,
    },
  ])(
    'should return $expected for a $resourceType summary of $summaryLength characters',
    ({ resourceType, summaryLength, expected }) => {
      // Given / When: the product and the type count in the length
      const error = validateMetaDescription({
        resourceType,
        summary: 'a'.repeat(summaryLength),
        title: TITLE,
      });

      // Then
      expect(error).toBe(expected);
    }
  );
});
