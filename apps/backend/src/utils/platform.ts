import { PlatformIdentifier } from '../__generated__/resolvers-types';

/** Display name of each Filigran platform, e.g. in mails and resource meta descriptions. */
export const PlatformIdentifierToString: Record<PlatformIdentifier, string> = {
  [PlatformIdentifier.Opencti]: 'OpenCTI',
  [PlatformIdentifier.Openaev]: 'OpenAEV',
  [PlatformIdentifier.Xtmone]: 'XTM One',
};
