import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';
import { useEffect } from 'react';

interface UnregisterPlatformNotRegisteredProps {
  confirm: () => void;
}

export const UnregisterPlatformNotRegistered = ({
  confirm,
}: UnregisterPlatformNotRegisteredProps) => {
  const t = useTranslate();

  useEffect(() => {
    confirm();
  }, [confirm]);

  return (
    <RegistrationLayout>
      <h1>{t(`Unregister.Error.PlatformNotRegistered.Title`)}</h1>
      <p>{t(`Unregister.Error.PlatformNotRegistered.Description`)}</p>
    </RegistrationLayout>
  );
};
