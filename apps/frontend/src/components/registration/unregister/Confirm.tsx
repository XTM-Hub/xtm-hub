import { RegistrationContext } from '@/components/registration/Context';
import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';
import { useContext } from 'react';

interface UnregisterConfirmProps {
  confirm: () => void;
  cancel: () => void;
  organizationName: string;
}

export const UnregisterConfirm = ({
  confirm,
  cancel,
  organizationName,
}: UnregisterConfirmProps) => {
  const { displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslate();

  return (
    <RegistrationLayout
      confirm={confirm}
      cancel={cancel}>
      <h1 className="title-sm">
        {t(`Unregister.Confirm.Title`, {
          platformIdentifier: displayedIdentifier,
          name: organizationName,
        })}
      </h1>
      <p>{t(`Unregister.Confirm.Description`)}</p>
    </RegistrationLayout>
  );
};
