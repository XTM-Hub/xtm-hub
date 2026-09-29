'use client';

import {
  CONSENT_CATEGORIES,
  CONSENT_REGISTRY,
} from '@/components/cookie-consent/cookie-consent.consts';
import {
  type ConsentCategory,
  type ServiceConsent,
} from '@/components/cookie-consent/cookie-consent.types';
import {
  acceptAllConsent,
  getAllServices,
  getDefaultConsent,
  isCategoryAllowed,
  setCategoryConsent,
} from '@/components/cookie-consent/cookie-consent.utils';
import { useConsent } from '@/components/cookie-consent/CookieConsentProvider';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
} from '@filigran/ui';
import { useState } from 'react';

const VISIBLE_CATEGORIES = CONSENT_CATEGORIES.filter(
  (category) => CONSENT_REGISTRY[category].services.length > 0
);

export const CookieConsentPreferences = () => {
  const t = useTranslate('CookieConsent');
  const { consent, isPreferencesOpen, closePreferences, save } = useConsent();
  const [draft, setDraft] = useState<ServiceConsent>(consent);
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({});
  const [wasOpen, setWasOpen] = useState(isPreferencesOpen);

  if (isPreferencesOpen !== wasOpen) {
    setWasOpen(isPreferencesOpen);
    if (isPreferencesOpen) {
      setDraft(consent);
    }
  }

  const allServices = getAllServices();
  const allGranted =
    allServices.length > 0 &&
    allServices.every((service) => draft[service.id] === true);

  const setAll = (value: boolean) =>
    setDraft(value ? acceptAllConsent() : getDefaultConsent());

  const toggleCategory = (category: ConsentCategory, value: boolean) =>
    setDraft((current) => setCategoryConsent(current, category, value));

  const toggleService = (serviceId: string) =>
    setDraft((current) => ({ ...current, [serviceId]: !current[serviceId] }));

  const toggleDrawer = (category: ConsentCategory) =>
    setOpenDrawers((current) => ({
      ...current,
      [category]: !current[category],
    }));

  return (
    <Dialog
      open={isPreferencesOpen}
      onOpenChange={(open) => {
        if (!open) {
          closePreferences();
        }
      }}>
      <DialogContent className="border-0 bg-elevation-background-layer-2">
        <DialogHeader>
          <DialogTitle>{t('Title')}</DialogTitle>
          <DialogDescription>{t('PreferencesIntro')}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <span className="body-compact">{t('PreferenceForAllServices')}</span>
          <Switch
            checked={allGranted}
            onCheckedChange={setAll}
            aria-label={t('PreferenceForAllServices')}
          />
        </div>

        <div className="flex flex-col gap-4 pl-xl">
          {VISIBLE_CATEGORIES.map((category) => {
            const { required, services } = CONSENT_REGISTRY[category];
            return (
              <div
                key={category}
                className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="body-base-medium">
                      {t(`Categories.${category}.Title`)}
                    </span>
                    <span className="body-base">
                      {t(`Categories.${category}.Description`)}
                    </span>
                    {services.length > 0 ? (
                      <Button
                        variant="link"
                        onClick={() => toggleDrawer(category)}
                        className="h-auto justify-start p-0 body-compact">
                        {t('ManageServices', { count: services.length })}
                      </Button>
                    ) : null}
                  </div>
                  <Switch
                    checked={isCategoryAllowed(draft, category)}
                    disabled={required}
                    onCheckedChange={(value) => toggleCategory(category, value)}
                    aria-label={t(`Categories.${category}.Title`)}
                  />
                </div>

                {services.length > 0 && openDrawers[category] ? (
                  <div className="ml-4 flex flex-col gap-3 border-l border-border pl-4">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="body-base-medium">
                            {service.name}
                          </span>
                          <div className="flex gap-3">
                            {service.readMoreUrl ? (
                              <a
                                href={service.readMoreUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="body-compact-link">
                                {t('ReadMore')}
                              </a>
                            ) : null}
                            {service.officialWebsiteUrl ? (
                              <a
                                href={service.officialWebsiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="body-compact-link">
                                {t('ViewOfficialWebsite')}
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <Switch
                          checked={draft[service.id] === true}
                          disabled={required}
                          onCheckedChange={() => toggleService(service.id)}
                          aria-label={service.name}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={() => save(draft)}>{t('Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
