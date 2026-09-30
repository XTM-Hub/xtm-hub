import { RegistrationContext } from '@/components/registration/Context';
import { useTranslations } from 'next-intl';
import React, { useContext } from 'react';
import { Button } from '@filigran/design-system';

interface RegistrationLayoutProps {
  children: React.ReactNode;
  cancel?: () => void;
  confirm?: () => void;
}

export const RegistrationLayout = ({
  children,
  cancel,
  confirm,
}: RegistrationLayoutProps) => {
  const { displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslations();
  return (
    <div className="h-full flex flex-col justify-between gap-xl">
      <div className="flex flex-col gap-m">{children}</div>
      <div className="flex justify-end gap-s">
        {Boolean(cancel) && (
          <Button
            priority="secondary" onClick={cancel}>
            {t(`Register.Back`, {
              platformIdentifier: displayedIdentifier,
            })}
          </Button>
        )}
        {Boolean(confirm) && (
          <Button onClick={confirm}>{t('Utils.Confirm')}</Button>
        )}
      </div>
    </div>
  );
};
