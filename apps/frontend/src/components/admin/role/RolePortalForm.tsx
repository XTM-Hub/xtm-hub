import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import {
  AutoForm,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
  SheetFooter,
} from '@filigran/ui';
import { PortalCapability } from '@graphql/generated';
import { useMemo } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

const portalCapabilityValues = Object.values(PortalCapability) as [
  PortalCapability,
  ...PortalCapability[],
];

const portalCapabilityOptions = portalCapabilityValues.map((capability) => ({
  id: capability,
  label: capability,
}));

const buildRolePortalFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('RoleListPage.Error.Role') }),
    capabilities: z.array(z.enum(portalCapabilityValues)).default([]),
  });

export type RolePortalFormValues = z.infer<
  ReturnType<typeof buildRolePortalFormSchema>
>;

const RolePortalForm = ({
  rolePortal,
  handleSubmit,
  onClose,
}: {
  rolePortal?: RolePortalFormValues;
  handleSubmit: (values: RolePortalFormValues) => void;
  onClose: () => void;
}) => {
  const t = useTranslate();
  const formSchema = useMemo(() => buildRolePortalFormSchema(t), [t]);

  return (
    <AutoForm
      formSchema={formSchema}
      values={rolePortal}
      onSubmit={(values) => handleSubmit(values)}
      fieldConfig={{
        name: {
          label: t('RoleListPage.Role'),
          inputProps: { placeholder: t('RoleListPage.Role') },
        },
        capabilities: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <FormLabel>{t('RoleListPage.Capabilities')}</FormLabel>
              <FormControl>
                <MultiSelectFormField
                  options={portalCapabilityOptions}
                  popoverContentClassName="bg-elevation-background-layer-3"
                  keyValue="id"
                  keyLabel="label"
                  defaultValue={field.value ?? []}
                  onValueChange={field.onChange}
                  noResultString={t('Utils.NotFound')}
                  placeholder={t('RoleListPage.Capabilities')}
                  variant="inverted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ),
        },
      }}>
      <SheetFooter className="pt-2">
        <div className="flex gap-s">
          <Button
            type="button"
            onClick={onClose}>
            {t('Utils.Cancel')}
          </Button>
          <Button type="submit">{t('Utils.Validate')}</Button>
        </div>
      </SheetFooter>
    </AutoForm>
  );
};

export default RolePortalForm;
