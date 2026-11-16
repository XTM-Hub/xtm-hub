'use client';

import { Form, FormField } from '@/components/ui/form';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import useDecodedQuery from '@/hooks/use-decoded-query';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { refreshAnalyticsUser } from '@/lib/analytics/analytics.user';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { decodeSafeRedirect } from '@/utils/redirect';
import { Button, Input } from '@filigran/design-system';
import { useLoginMutation } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  email: z.email('This is not a valid email.'),
  password: z.string(),
});

// Component
const LoginForm = () => {
  const router = useRouter();
  const t = useTranslate();
  const { redirect } = useDecodedQuery();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const { mutate: login } = useLoginMutation(portalGraphqlClient, {
    onError() {
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: t(`Error.Login.LoginError`),
      });
    },
    onSuccess() {
      refreshAnalyticsUser().then(() => {
        const destination = decodeSafeRedirect(redirect);
        if (destination) {
          router.push(destination);
        }
        // If login succeed, refresh the page
        router.refresh();
      });
    },
  });
  const onSubmit = (variables: z.infer<typeof formSchema>) => login(variables);
  return (
    <div className="layer-1 bg-elevation-default border border-elevation-subtle rounded w-full p-4 mb-4">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <Input
                label={t('LoginPage.Email')}
                placeholder={t('LoginPage.Email')}
                {...field}
              />
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <Input
                label={t('LoginPage.Password')}
                type="password"
                placeholder={t('LoginPage.Password')}
                {...field}
              />
            )}
          />
          <Button
            {...analyticsId('account_login_submit')}
            className="w-full"
            type="submit">
            {t('LoginPage.SignIn')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

// Component export
export default LoginForm;
