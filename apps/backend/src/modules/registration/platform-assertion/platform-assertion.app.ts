import { PlatformAssertionDomain } from './platform-assertion.domain';

export const PlatformAssertionApp = {
  purgeExpiredAssertionIds: async (): Promise<void> => {
    await PlatformAssertionDomain.deleteExpiredJtis();
  },
};
