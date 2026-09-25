import { RegistrationContext } from '@/components/registration/Context';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/ui/servers';
import React, { useContext } from 'react';

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
  const t = useTranslate();
  return (
    <div className="h-full flex flex-col justify-between gap-xl">
      <div className="flex flex-col gap-m">{children}</div>
      <div className="flex justify-end gap-s">
        {Boolean(cancel) && (
          <Button
            variant="secondary"
            onClick={cancel}>
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
