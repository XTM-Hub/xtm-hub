'use client';

import { LoginFormMutation } from '@/components/login/login.graphql';
import { Form, FormField } from '@/components/ui/form';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import useDecodedQuery from '@/hooks/use-decoded-query';
import { useTranslate } from '@/hooks/use-translate';
import { decodeSafeRedirect } from '@/utils/redirect';
import { Button, Input } from '@filigran/design-system';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
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
  const [commitLoginFormMutation] = useMutation(LoginFormMutation);
  const onSubmit = (variables: z.infer<typeof formSchema>) => {
    commitLoginFormMutation({
      variables,
      onError() {
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Login.LoginError`),
        });
      },
      onCompleted() {
        const destination = decodeSafeRedirect(redirect);
        if (destination) {
          router.push(destination);
        }
        // If login succeed, refresh the page
        router.refresh();
      },
    });
  };
  return (
    <div className="bg-elevation-background-layer-1 border border-border-light rounded w-full p-l mb-l">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-l">
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
