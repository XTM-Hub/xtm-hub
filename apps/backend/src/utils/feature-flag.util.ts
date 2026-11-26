import config from 'config';
import { FeatureFlag } from '../__generated__/resolvers-types';
import { logApp } from './app-logger.util';

export const PAUSED_FEATURE_FLAGS: ReadonlySet<FeatureFlag> = new Set([
  FeatureFlag.DecouplingConnectors,
]);

const isPausedFeatureFlag = (flag: string): boolean =>
  (PAUSED_FEATURE_FLAGS as ReadonlySet<string>).has(flag);

export const resolveFeatureFlags = (
  enabledFeatures: string[]
): FeatureFlag[] => {
  const allFlags = Object.values(FeatureFlag);

  if (enabledFeatures.includes('*')) {
    return allFlags.filter((flag) => !isPausedFeatureFlag(flag));
  }

  return enabledFeatures.filter((feature): feature is FeatureFlag => {
    const isValid = (allFlags as string[]).includes(feature);
    if (!isValid) {
      logApp.warn(
        `[FEATURE-FLAG] Unknown feature flag in config: "${feature}"`
      );
    }
    return isValid && !isPausedFeatureFlag(feature);
  });
};

export const isFeatureEnabled = (requiredFlag: FeatureFlag): boolean =>
  !isPausedFeatureFlag(requiredFlag) &&
  (config.get<string[]>('enabled_features') ?? []).some((flag) =>
    ['*', requiredFlag].includes(flag)
  );
