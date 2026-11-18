'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import {
  API_TOKEN_LIFETIME_DAYS,
  API_TOKEN_SCOPES,
  ApiTokenLifetimeDays,
  DEFAULT_API_TOKEN_LIFETIME_DAYS,
  getApiTokenExpiry,
} from '@/components/profile/api-tokens/api-token.utils';
import { FieldInfoTip } from '@/components/ui/FieldInfoTip';
import { Form, FormField } from '@/components/ui/form';
import { SelectField } from '@/components/ui/SelectField';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { useDateFormatter } from '@/utils/date';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Input,
} from '@filigran/design-system';
import { apiTokenKeys } from '@graphql/api-token/api-token.keys';
import { ApiTokenScope, useApiTokenCreateMutation } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const NAME_MAX_LENGTH = 100;

const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  organization_id: z.string().min(1),
  scope: z.enum(ApiTokenScope),
  lifetime: z.enum(API_TOKEN_LIFETIME_DAYS),
});

type CreateApiTokenValues = z.infer<typeof createApiTokenSchema>;

interface CreateApiTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatedToken {
  token: string;
  name: string;
}

export const CreateApiTokenDialog = ({
  open,
  onOpenChange,
}: CreateApiTokenDialogProps) => {
  const t = useTranslate();
  const formatDate = useDateFormatter();
  const queryClient = useQueryClient();
  const { me } = useContext(PortalContext);
  const organizations = me?.organizations ?? [];
  const [created, setCreated] = useState<CreatedToken>();

  const form = useForm<CreateApiTokenValues>({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: {
      name: '',
      organization_id: me?.selected_organization_id ?? '',
      scope: ApiTokenScope.Read,
      lifetime: DEFAULT_API_TOKEN_LIFETIME_DAYS,
    },
  });
  const lifetime = useWatch({ control: form.control, name: 'lifetime' });
  const scope = useWatch({ control: form.control, name: 'scope' });
  const infoTip = (field: string, text: string) => (
    <FieldInfoTip label={t('ApiTokens.Field.InfoLabel', { field })}>
      {text}
    </FieldInfoTip>
  );

  const { mutate: createApiToken, isPending } = useApiTokenCreateMutation(
    portalGraphqlClient,
    {
      onSuccess: async ({ createApiToken: result }) => {
        setCreated({ token: result.token, name: result.api_token.name });
        await queryClient.invalidateQueries({ queryKey: apiTokenKeys.all() });
      },
      onError: (error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : 'UNKNOWN_ERROR';
        showSnackbar({
          severity: 'error',
          title: t('Utils.Error'),
          description: t(`Error.Server.${errorMessage}`),
        });
      },
    }
  );

  const close = () => {
    onOpenChange(false);
    setCreated(undefined);
    form.reset();
  };

  const handleSubmit = (values: CreateApiTokenValues) => {
    createApiToken({
      input: {
        name: values.name,
        organization_id: values.organization_id,
        scope: values.scope,
        expires_at: getApiTokenExpiry(values.lifetime).toISOString(),
      },
    });
  };

  const copyToken = async () => {
    if (!created) {
      return;
    }
    try {
      await navigator.clipboard.writeText(created.token);
      showSnackbar({
        severity: 'success',
        title: t('ApiTokens.Created.Copied'),
      });
    } catch {
      showSnackbar({
        severity: 'error',
        title: t('Utils.Error'),
        description: t('ApiTokens.Created.CopyFailed'),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent
        // The secret is shown once: a stray click outside must not lose it.
        onInteractOutside={(e) => e.preventDefault()}>
        {created ? (
          <>
            <DialogTitle>{t('ApiTokens.Created.Title')}</DialogTitle>
            <DialogDescription>
              {t('ApiTokens.Created.Description', { name: created.name })}
            </DialogDescription>
            <DialogBody>
              <Input
                label={t('ApiTokens.Created.Token')}
                value={created.token}
                readOnly
                helperText={t('ApiTokens.Created.Helper')}
                onFocus={(e) => e.currentTarget.select()}
              />
            </DialogBody>
            <DialogFooter>
              <Button
                priority="secondary"
                {...analyticsId('account_api_token_copy')}
                onClick={copyToken}>
                {t('ApiTokens.Created.Copy')}
              </Button>
              <Button
                {...analyticsId('account_api_token_close')}
                onClick={close}>
                {t('ApiTokens.Created.Done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form
              className="contents"
              onSubmit={form.handleSubmit(handleSubmit)}>
              <DialogTitle>{t('ApiTokens.Create.Title')}</DialogTitle>
              <DialogDescription>
                {t('ApiTokens.Create.Description')}
              </DialogDescription>
              <DialogBody className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Input
                      label={t('ApiTokens.Field.Name')}
                      required
                      infoTooltip={infoTip(
                        t('ApiTokens.Field.Name'),
                        t('ApiTokens.Field.NameInfo')
                      )}
                      placeholder={t('ApiTokens.Field.NamePlaceholder')}
                      helperText={t('ApiTokens.Field.NameHelper')}
                      maxLength={NAME_MAX_LENGTH}
                      error={
                        fieldState.error
                          ? t('ApiTokens.Field.NameError')
                          : undefined
                      }
                      {...field}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization_id"
                  render={({ field, fieldState }) => (
                    <SelectField
                      formField
                      required
                      label={t('ApiTokens.Field.Organization')}
                      infoTooltip={infoTip(
                        t('ApiTokens.Field.Organization'),
                        t('ApiTokens.Field.OrganizationInfo')
                      )}
                      helperText={t('ApiTokens.Field.OrganizationHelper')}
                      options={organizations.map((organization) => ({
                        value: organization.id,
                        label: organization.personal_space
                          ? t('ApiTokens.PersonalSpace')
                          : organization.name,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      error={
                        fieldState.error
                          ? t('ApiTokens.Field.OrganizationError')
                          : undefined
                      }
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <SelectField
                      formField
                      required
                      label={t('ApiTokens.Field.Scope')}
                      infoTooltip={infoTip(
                        t('ApiTokens.Field.Scope'),
                        t('ApiTokens.Field.ScopeInfo')
                      )}
                      helperText={t(`ApiTokens.ScopeHelp.${scope}`)}
                      options={API_TOKEN_SCOPES.map((option) => ({
                        value: option,
                        label: t(`ApiTokens.Scope.${option}`),
                        description: t(`ApiTokens.ScopeOption.${option}`),
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                <FormField
                  control={form.control}
                  name="lifetime"
                  render={({ field }) => (
                    <SelectField
                      formField
                      required
                      label={t('ApiTokens.Field.Expiration')}
                      infoTooltip={infoTip(
                        t('ApiTokens.Field.Expiration'),
                        t('ApiTokens.Field.ExpirationInfo')
                      )}
                      helperText={t('ApiTokens.Field.ExpiresOn', {
                        date:
                          formatDate(
                            getApiTokenExpiry(lifetime),
                            'DATE_FULL'
                          ) ?? '',
                      })}
                      options={API_TOKEN_LIFETIME_DAYS.map((days) => ({
                        value: days,
                        label: t('ApiTokens.Lifetime', { count: Number(days) }),
                      }))}
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as ApiTokenLifetimeDays)
                      }
                    />
                  )}
                />
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  priority="secondary"
                  {...analyticsId('account_api_token_cancel')}
                  onClick={close}>
                  {t('Utils.Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  {...analyticsId('account_api_token_create')}>
                  {t('ApiTokens.Create.Submit')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};
