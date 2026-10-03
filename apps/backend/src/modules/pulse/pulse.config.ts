import portalConfig from '../../config';
import { logApp } from '../../utils/app-logger.util';
import {
  PULSE_RECOMMENDED_MIN_K_THRESHOLD,
  PulseRuntimeConfig,
  resolvePulseConfig,
} from './pulse.config.helper';

export type {
  PulseRuntimeConfig,
  PulseSecrets,
  PulseSettings,
} from './pulse.config.helper';

let runtimeConfig: PulseRuntimeConfig | undefined;

export const PulseConfig = {
  get: (): PulseRuntimeConfig => {
    runtimeConfig ??= resolvePulseConfig(
      portalConfig.pulse,
      portalConfig.environment
    );
    return runtimeConfig;
  },

  logStatus: (): void => {
    const config = PulseConfig.get();
    if (!config.enabled) {
      logApp[config.severity](
        `[Pulse] Threat Pulse is disabled: ${config.reason}`
      );
      return;
    }
    logApp.info('[Pulse] Threat Pulse is enabled', {
      kThreshold: config.settings.kThreshold,
      retentionMonths: config.settings.retentionMonths,
      contributionWindowDays: config.settings.contributionWindowDays,
    });
    if (config.settings.kThreshold < PULSE_RECOMMENDED_MIN_K_THRESHOLD) {
      logApp.warn(
        `[Pulse] PULSE_K_THRESHOLD is below ${PULSE_RECOMMENDED_MIN_K_THRESHOLD}, published statistics are weakly anonymized`
      );
    }
  },
};
