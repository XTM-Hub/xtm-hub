import { useTranslate } from '@/hooks/use-translate';
import Link from 'next/link';

const LoginMessage = () => {
  const t = useTranslate();

  return (
    <div className="bg-elevation-background-layer-1 border border-border-light rounded w-full p-xl text-sm text-center">
      {t('LoginPage.DontHaveAccount')}{' '}
      <Link
        className="text-primary"
        href="/sign-up">
        {t('LoginPage.SignUp')}
      </Link>
    </div>
  );
};

export default LoginMessage;
