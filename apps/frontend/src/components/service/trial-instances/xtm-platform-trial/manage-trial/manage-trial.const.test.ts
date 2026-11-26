import {
  getBundleRolePanels,
  ROLE_PANELS,
  splitUserSelection,
  toNewEmailEntry,
  trialUserRolesFormSchema,
} from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/manage-trial.const';
import { PlatformIdentifier, ServiceGroupName } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('getBundleRolePanels', () => {
  it('returns only the role panels matching the given products', () => {
    expect(
      getBundleRolePanels([PlatformIdentifier.Opencti]).map(
        ({ platform }) => platform
      )
    ).toEqual([PlatformIdentifier.Opencti]);
  });

  it('returns the role panels in ROLE_PANELS order, not in the products order', () => {
    expect(
      getBundleRolePanels([
        PlatformIdentifier.Xtmone,
        PlatformIdentifier.Opencti,
      ]).map(({ platform }) => platform)
    ).toEqual([PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone]);
  });

  it('returns every role panel when every product is given', () => {
    expect(getBundleRolePanels(Object.values(PlatformIdentifier))).toEqual(
      ROLE_PANELS
    );
  });

  it('returns no role panel when no product is given', () => {
    expect(getBundleRolePanels([])).toEqual([]);
  });
});

describe('splitUserSelection', () => {
  it('separates existing user ids from the emails to invite', () => {
    expect(
      splitUserSelection([
        'user-1',
        toNewEmailEntry('new@filigran.io'),
        'user-2',
      ])
    ).toEqual({ userIds: ['user-1', 'user-2'], emails: ['new@filigran.io'] });
  });

  it('returns empty lists when nothing is selected', () => {
    expect(splitUserSelection([])).toEqual({ userIds: [], emails: [] });
  });
});

describe('trialUserRolesFormSchema', () => {
  it.each([
    { userIds: ['user-1'], expected: true },
    { userIds: ['user-1', toNewEmailEntry('new@filigran.io')], expected: true },
    { userIds: [toNewEmailEntry('not-an-email')], expected: false },
    { userIds: [], expected: false },
  ])('validates userIds $userIds as $expected', ({ userIds, expected }) => {
    expect(
      trialUserRolesFormSchema.safeParse({
        userIds,
        xtmoneRole: ServiceGroupName.User,
      }).success
    ).toBe(expected);
  });
});
