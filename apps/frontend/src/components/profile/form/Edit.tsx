'use client';

import { PortalContext } from '@/components/me/AppPortalContext';
import { CountryCombobox } from '@/components/ui/country/Combobox';
import { useFormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';
import { AutoForm } from '@filigran/ui';
import { useContext } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  country: z
    .string()
    .transform((val) => val || null)
    .nullish(),
});

export type ProfileFormEditSchema = z.infer<typeof formSchema>;

interface ProfileFormEditProps {
  onSubmit: (values: ProfileFormEditSchema) => void;
}

const CountryField = ({
  field,
}: {
  field: ControllerRenderProps<FieldValues, string>;
}) => {
  const t = useTranslate();
  const { error } = useFormField();

  return (
    <CountryCombobox
      label={t('UserForm.Country')}
      value={field.value ? { name: field.value } : undefined}
      onValueChange={(value) => field.onChange(value?.name)}
      error={error?.message}
    />
  );
};

export const ProfileFormEdit = ({ onSubmit }: ProfileFormEditProps) => {
  const t = useTranslate();
  const { me } = useContext(PortalContext);

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('ProfilePage.Title')}</CardTitle>
      </CardHeader>
      <CardContent clamp={0}>
        <AutoForm
          onSubmit={(values) => onSubmit(values)}
          formSchema={formSchema}
          values={{
            first_name: me?.first_name ?? '',
            last_name: me?.last_name ?? '',
            country: me?.country ?? '',
          }}
          fieldConfig={{
            first_name: {
              label: t('UserForm.FirstName'),
              inputProps: {
                placeholder: t('UserForm.FirstName'),
              },
            },
            last_name: {
              label: t('UserForm.LastName'),
              inputProps: {
                placeholder: t('UserForm.LastName'),
              },
            },
            country: {
              fieldType: CountryField,
            },
          }}>
          <div className="flex justify-end">
            <Button
              type="submit"
              aria-label={t('ProfilePage.UpdateProfile')}>
              {t('Utils.Update')}
            </Button>
          </div>
        </AutoForm>
      </CardContent>
    </Card>
  );
};
