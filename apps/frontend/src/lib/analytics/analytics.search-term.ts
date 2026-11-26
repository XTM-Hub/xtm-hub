import {
  SEARCH_TERM_MASKS,
  SEARCH_TERM_TOKEN_CORE_PATTERN,
} from '@/lib/analytics/analytics.consts';

const refang = (value: string): string =>
  value.replace(/[[({]\.[\])}]/g, '.').replace(/\[:\]/g, ':');

const maskToken = (token: string): string => {
  const [, core = ''] = SEARCH_TERM_TOKEN_CORE_PATTERN.exec(token) ?? [];
  const refangedCore = refang(core);
  const mask = SEARCH_TERM_MASKS.find(({ pattern }) =>
    pattern.test(refangedCore)
  );
  return mask?.placeholder ?? token;
};

export const maskSearchTerm = (searchTerm: string): string =>
  searchTerm.replace(/\S+/g, maskToken);
