import { RegistrationContext } from '@/components/registration/Context';
import { useTranslate } from '@/hooks/use-translate';
import {
  analyticsId,
  type AnalyticsElementId,
} from '@/lib/analytics/analytics.ids';
import { Button } from '@filigran/design-system';
import React, { useContext } from 'react';

type RegistrationLayoutProps = {
  children: React.ReactNode;
} & (
  | { cancel: () => void; cancelAnalyticsId: AnalyticsElementId }
  | { cancel?: undefined; cancelAnalyticsId?: undefined }
) &
  (
    | { confirm: () => void; confirmAnalyticsId: AnalyticsElementId }
    | { confirm?: undefined; confirmAnalyticsId?: undefined }
  );

export const RegistrationLayout = ({
  children,
  cancel,
  cancelAnalyticsId,
  confirm,
  confirmAnalyticsId,
}: RegistrationLayoutProps) => {
  const { displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslate();
  return (
    <div className="h-full flex flex-col justify-between gap-6">
      <div className="flex flex-col gap-3">{children}</div>
      <div className="flex justify-end gap-2">
        {cancel && (
          <Button
            {...analyticsId(cancelAnalyticsId)}
            priority="secondary"
            onClick={cancel}>
            {t(`Register.Back`, {
              platformIdentifier: displayedIdentifier,
            })}
          </Button>
        )}
        {confirm && (
          <Button
            {...analyticsId(confirmAnalyticsId)}
            onClick={confirm}>
            {t('Utils.Confirm')}
          </Button>
        )}
      </div>
    </div>
  );
};
