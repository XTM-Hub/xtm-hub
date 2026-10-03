import { Resolvers } from '../../__generated__/resolvers-types';
import { PortalContext } from '../../model/portal-context';
import { mapToGraphQLError } from '../../utils/error/error.mapping';
import {
  extractPlatformId,
  extractPlatformToken,
} from '../security-management/token/platform-token.util';
import { PulseApp, PulseRequest } from './pulse.app';
import { isPulseError } from './pulse.errors';

const toPulseRequest = (context: PortalContext): PulseRequest => ({
  platformId: extractPlatformId(context.req),
  token: extractPlatformToken(context.req),
});

// Contract errors keep their `extensions.code`; anything else is an
// unexpected failure mapped like every other Hub resolver.
const resolvePulse = async <T>(callback: () => Promise<T>): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    if (isPulseError(error)) {
      throw error;
    }
    throw mapToGraphQLError(error);
  }
};

const pulseResolver: Resolvers = {
  Query: {
    pulseSalt: (_, { day }, context) =>
      resolvePulse(() => PulseApp.pulseSalt(toPulseRequest(context), day)),
    pulseStatus: (_, __, context) =>
      resolvePulse(() => PulseApp.pulseStatus(toPulseRequest(context))),
    pulseLookup: (_, { input }, context) =>
      resolvePulse(() => PulseApp.pulseLookup(toPulseRequest(context), input)),
    pulseTrending: (_, { input }, context) =>
      resolvePulse(() =>
        PulseApp.pulseTrending(toPulseRequest(context), input)
      ),
    pulseBenchmark: (_, { input }, context) =>
      resolvePulse(() =>
        PulseApp.pulseBenchmark(toPulseRequest(context), input)
      ),
  },
  Mutation: {
    pushPulse: (_, { input }, context) =>
      resolvePulse(() => PulseApp.pushPulse(toPulseRequest(context), input)),
    pulsePurge: (_, { platformId }, context) =>
      resolvePulse(() =>
        PulseApp.pulsePurge(toPulseRequest(context), platformId)
      ),
  },
};

export default pulseResolver;
