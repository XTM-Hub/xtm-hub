import config from 'config';
import { describe, expect, it, vi } from 'vitest';
import { FeatureFlag } from '../__generated__/resolvers-types';
import {
  isFeatureEnabled,
  PAUSED_FEATURE_FLAGS,
  resolveFeatureFlags,
} from './feature-flag.util';

vi.mock('config', async (importOriginal) => {
  const mod = await importOriginal<{ default: typeof config }>();
  return {
    default: {
      get: vi.fn(mod.default.get.bind(mod.default)),
      has: mod.default.has.bind(mod.default),
    },
  };
});

describe('resolveFeatureFlags', () => {
  const allUnpausedFlags = Object.values(FeatureFlag).filter(
    (flag) => !PAUSED_FEATURE_FLAGS.has(flag)
  );

  describe('wildcard handling', () => {
    it('should return all flags but the paused ones when "*" is present', () => {
      const result = resolveFeatureFlags(['*']);
      expect(result).toEqual(allUnpausedFlags);
    });

    it('should return all flags but the paused ones when "*" is mixed with other values', () => {
      const result = resolveFeatureFlags(['*', 'DUMMY', 'INVALID']);
      expect(result).toEqual(allUnpausedFlags);
    });
  });

  describe('paused flags', () => {
    it.each`
      enabledFeatures                       | expected               | description
      ${['DECOUPLING_CONNECTORS']}          | ${[]}                  | ${'paused flag listed alone'}
      ${['DECOUPLING_CONNECTORS', 'DUMMY']} | ${[FeatureFlag.Dummy]} | ${'paused flag listed with an active one'}
      ${['*', 'DECOUPLING_CONNECTORS']}     | ${allUnpausedFlags}    | ${'paused flag listed with the wildcard'}
    `(
      'should never return DECOUPLING_CONNECTORS when the config has $description',
      ({
        enabledFeatures,
        expected,
      }: {
        enabledFeatures: string[];
        expected: FeatureFlag[];
      }) => {
        // When
        const result = resolveFeatureFlags(enabledFeatures);

        // Then
        expect(result).toEqual(expected);
        expect(result).not.toContain(FeatureFlag.DecouplingConnectors);
      }
    );
  });

  describe('flag validation', () => {
    it.each`
      enabledFeatures | expected               | description
      ${['DUMMY']}    | ${[FeatureFlag.Dummy]} | ${'single valid flag'}
      ${[]}           | ${[]}                  | ${'empty array'}
      ${['INVALID']}  | ${[]}                  | ${'single invalid flag'}
      ${['DUMM']}     | ${[]}                  | ${'typo in flag name'}
      ${['dummy']}    | ${[]}                  | ${'lowercase flag name'}
    `(
      'should return $expected for $description',
      ({ enabledFeatures, expected }) => {
        expect(resolveFeatureFlags(enabledFeatures)).toEqual(expected);
      }
    );
  });

  describe('mixed valid and invalid flags', () => {
    it('should keep valid flags and filter out invalid ones', () => {
      const result = resolveFeatureFlags(['DUMMY', 'NONEXISTENT', 'TYPO']);
      expect(result).toEqual([FeatureFlag.Dummy]);
    });
  });
});

describe('isFeatureEnabled', () => {
  it.each([
    {
      enabledFeatures: ['DUMMY'],
      expected: true,
      description: 'flag is explicitly listed',
    },
    {
      enabledFeatures: ['DUMMY', 'OTHER'],
      expected: true,
      description: 'flag is among multiple flags',
    },
    {
      enabledFeatures: ['*'],
      expected: true,
      description: 'wildcard is present',
    },
    {
      enabledFeatures: ['*', 'DUMMY'],
      expected: true,
      description: 'wildcard is mixed with flag',
    },
    {
      enabledFeatures: [],
      expected: false,
      description: 'list is empty',
    },
    {
      enabledFeatures: ['OTHER'],
      expected: false,
      description: 'flag is not in list',
    },
    {
      enabledFeatures: undefined,
      expected: false,
      description: 'config returns undefined',
    },
  ])(
    'should return $expected when $description',
    ({ enabledFeatures, expected }) => {
      vi.mocked(config.get).mockReturnValue(enabledFeatures);
      expect(isFeatureEnabled(FeatureFlag.Dummy)).toBe(expected);
    }
  );
});

describe('isFeatureEnabled for a paused flag', () => {
  it.each([
    {
      enabledFeatures: ['*'],
      description: 'wildcard is present',
    },
    {
      enabledFeatures: ['DECOUPLING_CONNECTORS'],
      description: 'flag is explicitly listed',
    },
    {
      enabledFeatures: ['*', 'DECOUPLING_CONNECTORS'],
      description: 'wildcard is mixed with flag',
    },
  ])(
    'should return false for DECOUPLING_CONNECTORS when $description',
    ({ enabledFeatures }) => {
      // Given
      vi.mocked(config.get).mockReturnValue(enabledFeatures);

      // When
      const result = isFeatureEnabled(FeatureFlag.DecouplingConnectors);

      // Then
      expect(result).toBe(false);
    }
  );
});
