import { describe, expect, it } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import { OpenCtiHuntPack } from '../../../../__generated__/resolvers-types';
import huntPackResolver from './hunt-pack.resolver';

const resolve = async (
  field: 'hunt_count' | 'attack_techniques' | 'hunt_platforms',
  parent: Record<string, unknown>
) =>
  (
    huntPackResolver.OpenCTIHuntPack as unknown as Record<
      typeof field,
      (...args: unknown[]) => unknown
    >
  )[field](
    parent as unknown as OpenCtiHuntPack,
    {},
    contextSimpleUserFiligran2,
    GRAPHQL_RESOLVE_INFO
  );

describe('openCTIHuntPack field resolvers', () => {
  it.each`
    value    | expected
    ${'12'}  | ${12}
    ${'0'}   | ${0}
    ${'-1'}  | ${null}
    ${'1.5'} | ${null}
    ${'abc'} | ${null}
    ${null}  | ${null}
  `(
    'resolves hunt_count $expected from "$value"',
    async ({ value, expected }) => {
      expect(await resolve('hunt_count', { hunt_count: value })).toBe(expected);
    }
  );

  it('parses the techniques and hunted platforms stored as JSON', async () => {
    expect(
      await resolve('attack_techniques', {
        attack_techniques: '["T1059","T1003"]',
      })
    ).toEqual(['T1059', 'T1003']);
    expect(
      await resolve('hunt_platforms', { hunt_platforms: '["splunk"]' })
    ).toEqual(['splunk']);
  });

  it('defaults to empty lists when the metadata is missing or malformed', async () => {
    expect(await resolve('attack_techniques', {})).toEqual([]);
    expect(
      await resolve('hunt_platforms', { hunt_platforms: 'not-json' })
    ).toEqual([]);
  });
});
