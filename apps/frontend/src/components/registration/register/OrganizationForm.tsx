import { RegistrationContext } from '@/components/registration/Context';
import { AutoForm } from '@/components/ui/auto-form';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { Button, Radio, RadioGroup } from '@filigran/design-system';
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
            },
            organizationId: {
              fieldType: ({ field }) => (
                <div className="flex flex-col gap-m">
                  <p className="text-sm font-medium leading-none">
                    {t(`Register.OrganizationForm.Description`)}
                    <span className="text-input-required"> *</span>
                  </p>
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        aria-label={t('Register.OrganizationForm.Description')}
                        value={field.value}
                        onValueChange={field.onChange}>
                        {organizations.map((organization) => {
                          const isPersonal = organization.personal_space;
                          const typeLabelKey = isPersonal
                            ? 'Register.OrganizationForm.PersonalWorkspace'
                            : 'Register.OrganizationForm.OrganizationalWorkspace';
                          const descriptionKey = isPersonal
                            ? 'Register.OrganizationForm.PersonalDescription'
                            : 'Register.OrganizationForm.OrganizationalDescription';
                          return (
                            <Radio
                              key={organization.id}
                              value={organization.id}
                              label={
                                <>
                                  {organization.name} ({t(typeLabelKey)})
                                  {!isPersonal && (
                                    <span className="italic">
                                      {' - '}
                                      {t(
                                        'Register.OrganizationForm.Recommended'
                                      )}
                                    </span>
                                  )}
                                </>
                              }
                              description={t(descriptionKey)}
                            />
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </div>
              ),
            },
          }}>
          <div className="flex justify-end gap-s">
            <Button
              priority="secondary"
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
