import { describe, expect, it } from 'vitest';
import defaultConfig from '../config/default.json';
import productionConfig from '../config/production.json';
import portalConfig from './config';

describe('portalConfig', () => {
  it('should trust exactly one proxy hop when TRUST_PROXY is not set', () => {
    // Given
    // config/default.json and no TRUST_PROXY in the test environment

    // When
    const trustProxy = portalConfig.trust_proxy;

    // Then
    expect(trustProxy).toBe(1);
  });

  describe('enabled_teams_notifications', () => {
    it('should expose the not published reminder flag as a boolean', () => {
      // Given the loaded configuration

      // When
      const flag =
        portalConfig.enabled_teams_notifications
          .resource_not_published_reminder;

      // Then
      expect(typeof flag).toBe('boolean');
    });

    it.each`
      file            | configuration       | expected
      ${'default'}    | ${defaultConfig}    | ${false}
      ${'production'} | ${productionConfig} | ${true}
    `(
      'should set the not published reminder flag to $expected in $file.json',
      ({
        configuration,
        expected,
      }: {
        configuration: typeof defaultConfig | typeof productionConfig;
        expected: boolean;
      }) => {
        // Given the configuration file

        // When
        const flag =
          configuration.enabled_teams_notifications
            .resource_not_published_reminder;

        // Then
        expect(flag).toBe(expected);
      }
    );
  });
});
