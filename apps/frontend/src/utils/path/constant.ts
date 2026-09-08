export const PUBLIC_CYBERSECURITY_SOLUTIONS_PATH = 'cybersecurity-solutions';

export const XTM_PLATFORM_ROADMAP_SLUG = 'xtm-platform-roadmap';

export const APP_PATH = 'app';

export const XTM_PLATFORM_TRIAL_PATH = `/${APP_PATH}/service/xtm-platform-trial`;

export const xtmPlatformTrialBundlePath = (serviceInstanceId: string) =>
  `${XTM_PLATFORM_TRIAL_PATH}/${serviceInstanceId}`;

export const xtmPlatformTrialManageUsersPath = (serviceInstanceId: string) =>
  `${xtmPlatformTrialBundlePath(serviceInstanceId)}/manage-users`;

export const XTM_PLATFORM_TRIAL_GUIDE_PATH = `/${APP_PATH}/service/xtm-platform-trial-guide`;
