import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';

interface RegisterStateFailedProps {
  cancel: () => void;
}

export const RegisterStateFailed = ({ cancel }: RegisterStateFailedProps) => {
  const t = useTranslate();
  return (
    <RegistrationLayout cancel={cancel}>
      <h1>{t(`Register.Failed.Title`)}</h1>
      <p>{t(`Register.Failed.Description`)}</p>
    </RegistrationLayout>
  );
};
