import { RegistrationContext } from '@/components/registration/Context';
import { useTranslate } from '@/hooks/use-translate';
import { AutoForm } from '@filigran/ui';
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@filigran/ui/clients';
import { Button, Input } from '@filigran/ui/servers';
import { organizationListUserOrganizationsQuery$data } from '@generated/organizationListUserOrganizationsQuery.graphql';
import { useContext } from 'react';
import { z } from 'zod';

interface RegisterOrganizationFormProps {
  userOrganizationsQueryData: organizationListUserOrganizationsQuery$data;
  defaultPlatformName: string;
  cancel: () => void;
  confirm: (organizationId: string, platformName: string) => void;
}

export const selectOrganizationFormSchema = z.object({
  platformName: z.string().nonempty(),
  organizationId: z.string().nonempty(),
});

export const RegisterOrganizationForm = ({
  cancel,
  confirm,
  userOrganizationsQueryData,
  defaultPlatformName,
}: RegisterOrganizationFormProps) => {
  const organizations = [...userOrganizationsQueryData.userOrganizations].sort(
    (a, b) => Number(a.personal_space) - Number(b.personal_space)
  );
  const { displayedIdentifier } = useContext(RegistrationContext);
  const t = useTranslate();

  const defaultOrganization = organizations[0];

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col justify-between gap-xl">
        <div className="space-y-m">
          <h1 className="txt-subtitle">
            {t(`Register.OrganizationForm.Title`, {
              platformIdentifier: displayedIdentifier,
            })}
          </h1>
        </div>
        <AutoForm
          formSchema={selectOrganizationFormSchema}
          values={{
            platformName: defaultPlatformName,
            organizationId: defaultOrganization?.id ?? '',
          }}
          onSubmit={({ organizationId, platformName }) => {
            confirm(organizationId, platformName);
          }}
          fieldConfig={{
            platformName: {
              label: t('Register.OrganizationForm.PlatformNameLabel'),
              inputProps: {
                className: 'bg-grayblue-700 border-none',
              },
            },
            organizationId: {
              fieldType: ({ field }) => (
                <div className="flex flex-col gap-m">
                  <p className="text-sm font-medium leading-none">
                    {t(`Register.OrganizationForm.Description`)}
                    <span className="text-destructive"> *</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    {organizations.map((organization) => {
                      const isPersonal = organization.personal_space;
                      const typeLabelKey = isPersonal
                        ? 'Register.OrganizationForm.PersonalWorkspace'
                        : 'Register.OrganizationForm.OrganizationalWorkspace';
                      const descriptionKey = isPersonal
                        ? 'Register.OrganizationForm.PersonalDescription'
                        : 'Register.OrganizationForm.OrganizationalDescription';
                      return (
                        <FormItem
                          key={organization.id}
                          className="flex flex-col">
                          <div className="flex items-center flex-row gap-2">
                            <FormControl>
                              <Input
                                className="w-auto h-4 w-4 accent-primary shrink-0"
                                aria-labelledby={`register-form-organization-${organization.id}`}
                                type="radio"
                                onChange={() => {
                                  field.onChange(organization.id);
                                }}
                                checked={field.value === organization.id}
                                value={organization.name}
                              />
                            </FormControl>

                            <FormLabel
                              id={`register-form-organization-${organization.id}`}
                              className="!mt-0">
                              {organization.name} ({t(typeLabelKey)})
                              {!isPersonal && (
                                <span className="italic">
                                  {' - '}
                                  {t('Register.OrganizationForm.Recommended')}
                                </span>
                              )}
                            </FormLabel>
                          </div>
                          <p className="text-sm text-muted-foreground pl-6">
                            {t(descriptionKey)}
                          </p>
                          <FormMessage />
                        </FormItem>
                      );
                    })}
                  </div>
                </div>
              ),
            },
          }}>
          <div className="flex justify-end gap-s">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                cancel();
              }}>
              {t('Utils.Cancel')}
            </Button>

            <Button type="submit">{t('Register.Confirm')}</Button>
          </div>
        </AutoForm>
      </div>
    </div>
  );
};
