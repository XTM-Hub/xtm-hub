'use client';

import {
  purgeCookies,
  writeClientConsent,
} from '@/components/cookie-consent/cookie-consent.client';
import {
  type ConsentCategory,
  type ServiceConsent,
  type StoredConsent,
} from '@/components/cookie-consent/cookie-consent.types';
import {
  acceptAllConsent,
  getCookiePatternsToPurge,
  getDefaultConsent,
  getRevokedServices,
  isCategoryAllowed,
  isServiceAllowed,
  needsConsent,
  normalizeConsent,
} from '@/components/cookie-consent/cookie-consent.utils';
import { revokeAnalyticsConsent } from '@/lib/analytics/analytics.client';
import { GA_CONSENT_SERVICE_ID } from '@/lib/analytics/analytics.consts';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface CookieConsentContextValue {
  consent: ServiceConsent;
  isServiceAllowed: (serviceId: string) => boolean;
  isCategoryAllowed: (category: ConsentCategory) => boolean;
  showBanner: boolean;
  isPreferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  save: (services: ServiceConsent) => void;
}

export const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

interface CookieConsentProviderProps {
  initialConsent: StoredConsent | null;
  children: ReactNode;
}

export const CookieConsentProvider = ({
  initialConsent,
  children,
}: CookieConsentProviderProps) => {
  const [stored, setStored] = useState<StoredConsent | null>(initialConsent);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  const showBanner = useMemo(() => needsConsent(stored), [stored]);

  const consent = useMemo(
    () => (stored && !showBanner ? stored.services : getDefaultConsent()),
    [stored, showBanner]
  );

  const persist = useCallback(
    (nextServices: ServiceConsent) => {
      const normalized = normalizeConsent(nextServices);
      const revoked = getRevokedServices(
        stored?.services ?? getDefaultConsent(),
        normalized
      );
      if (revoked.includes(GA_CONSENT_SERVICE_ID)) {
        revokeAnalyticsConsent();
      }
      purgeCookies(getCookiePatternsToPurge(revoked));
      setStored(writeClientConsent(normalized));
      setIsPreferencesOpen(false);
    },
    [stored]
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      isServiceAllowed: (serviceId) => isServiceAllowed(consent, serviceId),
      isCategoryAllowed: (category) => isCategoryAllowed(consent, category),
      showBanner,
      isPreferencesOpen,
      openPreferences: () => setIsPreferencesOpen(true),
      closePreferences: () => setIsPreferencesOpen(false),
      acceptAll: () => persist(acceptAllConsent()),
      rejectAll: () => persist(getDefaultConsent()),
      save: persist,
    }),
    [consent, showBanner, isPreferencesOpen, persist]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export const useConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useConsent must be used within a CookieConsentProvider');
  }
  return context;
};
