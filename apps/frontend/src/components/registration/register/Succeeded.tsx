import { RegistrationLayout } from '@/components/registration/Layout';
import { useTranslate } from '@/hooks/use-translate';

interface RegisterStateSucceededProps {
  displayedIdentifier: string;
}

export const RegisterStateSucceeded = ({
  displayedIdentifier,
}: RegisterStateSucceededProps) => {
  const t = useTranslate();
  return (
    <RegistrationLayout>
      <h1>
        {t(`Register.Succeeded.Title`, {
          platformIdentifier: displayedIdentifier,
        })}
      </h1>
      <p>{t(`Register.Succeeded.Description`)}</p>
    </RegistrationLayout>
  );
};
