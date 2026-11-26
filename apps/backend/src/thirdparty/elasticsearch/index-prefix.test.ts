import { describe, expect, it } from 'vitest';
import { buildPrefixedName } from './index-prefix';

const PREFIX = 'hub';

describe('buildPrefixedName', () => {
  it.each([
    ['the telemetry index', 'telemetry_v1', 'telemetry_v1'],
    ['the telemetry alias', 'telemetry', 'telemetry'],
    ['the index template', 'telemetry-template', 'telemetry-template'],
    ['the template pattern', 'telemetry_v*', 'telemetry_v*'],
    ['the migration index', 'migrations', 'migrations'],
  ])(
    'should keep the name of %s when no prefix is configured',
    (_description, name, expected) => {
      // Given
      const prefix = '';

      // When
      const result = buildPrefixedName(prefix, name);

      // Then
      expect(result).toBe(expected);
    }
  );

  it.each([
    ['the telemetry index', 'telemetry_v1', `${PREFIX}_telemetry_v1`],
    ['the telemetry alias', 'telemetry', `${PREFIX}_telemetry`],
    [
      'the index template',
      'telemetry-template',
      `${PREFIX}_telemetry-template`,
    ],
    ['the template pattern', 'telemetry_v*', `${PREFIX}_telemetry_v*`],
    ['the migration index', 'migrations', `${PREFIX}_migrations`],
  ])(
    'should prefix the name of %s when a prefix is configured',
    (_description, name, expected) => {
      // Given
      const prefix = PREFIX;

      // When
      const result = buildPrefixedName(prefix, name);

      // Then
      expect(result).toBe(expected);
    }
  );
});
