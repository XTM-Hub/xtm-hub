import {
  buildTrialsFilters,
  formatCancellationReason,
  matchSearchRegions,
  sortProducts,
} from '@/components/trials/tab/trials-tab.utils';
import { TrialsTabType } from '@/components/trials/trials.const';
import {
  DeploymentRequestDeploymentType,
  DeploymentRequestFilterKey,
  DeploymentRequestHubStatus,
  DeploymentRequestPlatformRegion,
  PlatformIdentifier,
  TrialsProductFragment,
} from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('manageTrialsUtils', () => {
  describe('buildTrialsFilters', () => {
    it.each(Object.values(TrialsTabType))(
      'should only ask for bundles on the %s tab',
      (type) => {
        // When
        const filters = buildTrialsFilters(type);

        // Then
        expect(filters).toContainEqual({
          key: DeploymentRequestFilterKey.Type,
          value: [DeploymentRequestDeploymentType.Bundle],
        });
      }
    );

    it('should restrict the waiting tab to queued requests', () => {
      // When
      const filters = buildTrialsFilters(TrialsTabType.Waiting);

      // Then
      expect(filters).toContainEqual({
        key: DeploymentRequestFilterKey.HubStatus,
        value: [DeploymentRequestHubStatus.Queued],
      });
    });
  });

  describe('sortProducts', () => {
    const product = (
      platformIdentifier: PlatformIdentifier
    ): TrialsProductFragment => ({
      id: `product-${platformIdentifier}`,
      platform_identifier: platformIdentifier,
      hub_status: DeploymentRequestHubStatus.Active,
      platform_id: 'platform-1',
      service_instance_id: `instance-${platformIdentifier}`,
    });

    it('should always order the products the same way, whatever the order they come in', () => {
      // Given
      const opencti = product(PlatformIdentifier.Opencti);
      const openaev = product(PlatformIdentifier.Openaev);
      const xtmone = product(PlatformIdentifier.Xtmone);

      // When
      const sorted = sortProducts([xtmone, openaev, opencti]);

      // Then
      expect(sorted).toEqual([opencti, openaev, xtmone]);
    });
  });

  describe('matchSearchRegions', () => {
    const regionLabels: Record<string, string> = {
      'Region.EU_WEST': 'Europe West',
      'Region.US_EAST': 'United States East',
      'Region.APAC_AU': 'Australia',
      'Region.APAC_SG': 'Singapore',
    };
    const regionT = (key: string): string => regionLabels[key] ?? key;

    it.each`
      term             | expected                                                                            | description
      ${'Europe West'} | ${[DeploymentRequestPlatformRegion.EuWest]}                                         | ${'the full label'}
      ${'europe'}      | ${[DeploymentRequestPlatformRegion.EuWest]}                                         | ${'part of the label, in another case'}
      ${'  Europe  '}  | ${[DeploymentRequestPlatformRegion.EuWest]}                                         | ${'a label surrounded by spaces'}
      ${'eu_west'}     | ${[DeploymentRequestPlatformRegion.EuWest]}                                         | ${'the raw code'}
      ${'EU_WEST'}     | ${[DeploymentRequestPlatformRegion.EuWest]}                                         | ${'the raw code in upper case'}
      ${'east'}        | ${[DeploymentRequestPlatformRegion.UsEast]}                                         | ${'a word shared by a label and a code'}
      ${'apac'}        | ${[DeploymentRequestPlatformRegion.ApacAu, DeploymentRequestPlatformRegion.ApacSg]} | ${'the prefix of several codes'}
    `(
      'should match the regions of "$term" ($description)',
      ({ term, expected }) => {
        // When
        const regions = matchSearchRegions(term, regionT);

        // Then
        expect(regions).toEqual(expect.arrayContaining(expected));
        expect(regions).toHaveLength(expected.length);
      }
    );

    it('should match a region by its label in the current locale', () => {
      // Given
      const frT = (key: string): string =>
        key === 'Region.EU_WEST' ? 'Europe Ouest' : key;

      // When
      const regions = matchSearchRegions('ouest', frT);

      // Then
      expect(regions).toEqual([DeploymentRequestPlatformRegion.EuWest]);
    });

    it('should match no region when the term matches neither a label nor a code', () => {
      // When
      const regions = matchSearchRegions('john.doe@filigran.io', regionT);

      // Then
      expect(regions).toEqual([]);
    });

    it.each`
      term     | description
      ${null}  | ${'no term'}
      ${''}    | ${'an empty term'}
      ${'   '} | ${'a blank term'}
    `('should match no region for $description', ({ term }) => {
      // When
      const regions = matchSearchRegions(term, regionT);

      // Then
      expect(regions).toEqual([]);
    });
  });

  /**
   * Mock translation function that simulates next-intl's `t()`.
   * Returns the actual translated value for known keys, and the raw key
   * for anything else (mimicking next-intl's fallback behavior).
   */
  const translations: Record<string, string> = {
    'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther':
      'Other',
    'Service.Trials.CancellationReason.value':
      'Intelligence lacks actionable insight for our specific needs',
    'Service.Trials.CancellationReason.compatibility':
      'Incompatible with our existing security stack',
    'Service.Trials.CancellationReason.complexity':
      'Configuration is too complex to complete within a reasonable timeframe',
    'Service.Trials.CancellationReason.legal-security':
      'Internal security or legal team required immediate termination',
    'Service.Trials.CancellationReason.expertise':
      'We lack the internal analysts/expertise to utilise the tool effectively',
  };

  const mockT = (key: string): string => translations[key] ?? key;

  describe('formatCancellationReason', () => {
    describe('standard reasons (known keywords)', () => {
      it.each`
        reason              | expected
        ${'value'}          | ${translations['Service.Trials.CancellationReason.value']}
        ${'compatibility'}  | ${translations['Service.Trials.CancellationReason.compatibility']}
        ${'complexity'}     | ${translations['Service.Trials.CancellationReason.complexity']}
        ${'legal-security'} | ${translations['Service.Trials.CancellationReason.legal-security']}
        ${'expertise'}      | ${translations['Service.Trials.CancellationReason.expertise']}
      `(
        'should translate "$reason" to its full label',
        ({ reason, expected }) => {
          expect(formatCancellationReason(reason, mockT)).toBe(expected);
        }
      );
    });

    describe('"Other" without free text', () => {
      it.each`
        reason     | description
        ${'Other'} | ${'capital O — new submission'}
        ${'other'} | ${'lowercase — migrated from old data'}
        ${'OTHER'} | ${'all caps — any casing'}
      `(
        'should return the Other label for "$reason" ($description)',
        ({ reason }) => {
          expect(formatCancellationReason(reason, mockT)).toBe('Other');
        }
      );
    });

    describe('"Other: <free text>" with free text', () => {
      it.each`
        reason                          | expected                        | description
        ${'Other: my custom reason'}    | ${'Other: my custom reason'}    | ${'standard free text'}
        ${'Other:   lots of spaces   '} | ${'Other: lots of spaces'}      | ${'whitespace trimmed'}
        ${'Other:'}                     | ${'Other'}                      | ${'empty after colon'}
        ${'Other:  '}                   | ${'Other'}                      | ${'only whitespace after colon'}
        ${'Other: reason: with colons'} | ${'Other: reason: with colons'} | ${'colons preserved in free text'}
      `(
        'should format "$reason" as "$expected" ($description)',
        ({ reason, expected }) => {
          expect(formatCancellationReason(reason, mockT)).toBe(expected);
        }
      );
    });

    describe('i18n — French locale', () => {
      const frT = (key: string): string =>
        key ===
        'Service.Trials.Cancellation.ConfirmationForm.CancellationReasonOther'
          ? 'Autre'
          : key;

      it.each`
        reason                | expected
        ${'Other'}            | ${'Autre'}
        ${'other'}            | ${'Autre'}
        ${'Other: ma raison'} | ${'Autre: ma raison'}
      `(
        'should return "$expected" for "$reason" in FR',
        ({ reason, expected }) => {
          expect(formatCancellationReason(reason, frT)).toBe(expected);
        }
      );
    });
  });
});
