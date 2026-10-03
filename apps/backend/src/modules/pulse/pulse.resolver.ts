import { Resolvers } from '../../__generated__/resolvers-types';
import { PortalContext } from '../../model/portal-context';
import { REDACTED_PULSE_ERROR_MESSAGE } from '../../server/apollo-plugins/log';
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

const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

// The error builders log the error they are given, message and stack
// included, and a database error carries its SQL bindings (at-rest keys,
// platform pseudonyms) in its message: only the error class, a code-only
// message (which mapToGraphQLError maps by value) and the driver code reach
// the log.
export const sanitizePulseFailure = (error: unknown): Error => {
  const original = error instanceof Error ? error : undefined;
  const message =
    original && ERROR_CODE.test(original.message)
      ? original.message
      : REDACTED_PULSE_ERROR_MESSAGE;
  const sanitized = new Error(message);
  sanitized.name = original?.name ?? 'Error';
  sanitized.stack = `${sanitized.name}: ${message}`;
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)) {
    Object.assign(sanitized, { code });
  }
  return sanitized;
};

// Contract errors keep their `extensions.code`; anything else is an
// unexpected failure mapped like every other Hub resolver.
export const resolvePulse = async <T>(
  callback: () => Promise<T>
): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    if (isPulseError(error)) {
      throw error;
    }
    throw mapToGraphQLError(sanitizePulseFailure(error));
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
