import { TestEnvBanner } from '@/components/admin/TestEnvBanner';
import LoginForm from '@/components/login/LoginForm';
import LoginMessage from '@/components/login/LoginMessage';
import LoginTitleForm from '@/components/login/LoginTitle';
import { SettingsContext } from '@/components/settings/EnvPortalContext';
import useDecodedQuery from '@/hooks/use-decoded-query';
import { useTranslate } from '@/hooks/use-translate';
import { useToast } from '@filigran/ui/clients';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';

export const LoginLayout = ({}) => {
  const { settings } = useContext(SettingsContext);
  const router = useRouter();

  const { error, redirect } = useDecodedQuery();
  const currentPath = usePathname();
  const { toast } = useToast();
  const t = useTranslate();

  const localProvider = settings?.platform_providers?.find(
    (p) => p.provider === 'local'
  );

  useEffect(() => {
    if (!localProvider) {
      const target = redirect ? `/sign-up?redirect=${redirect}` : '/sign-up';
      router.replace(target);
    }
  }, [localProvider, redirect, router]);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: t('UnexpectedErrorDialog.Title'),
        description: t('UnexpectedErrorDialog.Description'),
      });
    }
  }, [currentPath, error, t, toast]);

  if (!localProvider) {
    return null;
  }

  return (
    <main className="absolute inset-0 z-0 m-auto flex max-w-[450px] flex-col justify-center">
      <TestEnvBanner />
      <div className="flex flex-col items-center p-xl sm:p-0">
        <LoginTitleForm />
        <div className="space-y-l mt-l w-full flex flex-col items-center">
          <LoginMessage />
          <LoginForm />
        </div>
      </div>
    </main>
  );
};
