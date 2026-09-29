'use client';
import { useTranslate } from '@/hooks/use-translate';
import LogoXTMDark from '@public/logo_xtm_hub_dark.svg';

const LoginTitleForm = ({}) => {
  const t = useTranslate();
  return (
    <>
      <LogoXTMDark />
      <h1 className="sr-only">{t('LoginPage.Title')}</h1>
    </>
  );
};

export default LoginTitleForm;
