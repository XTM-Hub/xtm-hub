import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Combobox,
  ComboboxChips,
  ComboboxField,
  ComboboxHelperText,
  ComboboxInput,
  ComboboxLabel,
  Input,
} from '@filigran/design-system';
import { Form, FormField, SheetFooter } from '@filigran/ui';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyboardEvent, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface OrganizationFormSheetProps {
  organization?: organizationItem_fragment$data;
  handleSubmit: (values: z.infer<typeof organizationFormSchema>) => void;
}

export const OrganizationForm = ({
  organization,
  handleSubmit,
}: OrganizationFormSheetProps) => {
  const { handleCloseSheet, setIsDirty } = useDialogContext();

  const t = useTranslate();

  const form = useForm<z.infer<typeof organizationFormSchema>>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: organization?.name ?? '',
      domains: (organization?.domains as string[]) ?? [],
    },
  });
  setIsDirty(form.formState.isDirty);

  const onSubmit = (values: z.infer<typeof organizationFormSchema>) => {
    handleSubmit({
      ...values,
    });
  };

  const { setValue, setError, clearErrors } = form;
  const [domainInput, setDomainInput] = useState('');

  const validTagDomain = (tag: string) => {
    // Exemple of valid domain : example.com, sub.example.com, my-site.co.uk
    const domainRegex = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
    const domainsValue = form.getValues('domains');

    if (!domainRegex.test(tag)) {
      setError('domains', {
        message: t('OrganizationForm.Error.DomainsInvalid'),
      });
      return false;
    } else if (
      domainsValue.some((d) => d.toLowerCase() === tag.toLowerCase())
    ) {
      setError('domains', {
        message: t('OrganizationForm.Error.DuplicateName'),
      });
      return false;
    } else {
      clearErrors('domains');
    }
    return true;
  };

  const handleDomainKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') {
      return;
    }
    const text = domainInput.trim();
    if (!validTagDomain(text)) {
      // Keeps the typed text and stops Enter from submitting the form.
      event.preventDefault();
      return;
    }
    if (event.key === ',') {
      event.preventDefault();
      setValue('domains', [...form.getValues('domains'), text], {
        shouldDirty: true,
      });
      setDomainInput('');
    }
  };

  return (
    <Form {...form}>
      <form
        className="w-full space-y-xl"
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <Input
              label={t('OrganizationForm.Name')}
              placeholder={t('OrganizationForm.Name')}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="domains"
          render={({ field, fieldState }) => (
            <Combobox<string>
              multiple
              options={[]}
              value={field.value}
              onValueChange={(next) =>
                setValue('domains', next as string[], { shouldDirty: true })
              }
              open={false}
              allowCustomValue
              createValueFromInput={(input) => input}
              inputValue={domainInput}
              onInputChange={setDomainInput}
              error={Boolean(fieldState.error?.message)}>
              <ComboboxLabel>{t('OrganizationForm.Domains')}</ComboboxLabel>
              <ComboboxField>
                <ComboboxChips />
                <ComboboxInput
                  ref={field.ref}
                  onBlur={field.onBlur}
                  placeholder={t('OrganizationForm.DomainsPlaceholder')}
                  onKeyDown={handleDomainKeyDown}
                  aria-invalid={fieldState.error?.message ? true : undefined}
                />
              </ComboboxField>
              {fieldState.error?.message && (
                <ComboboxHelperText>
                  {fieldState.error.message}
                </ComboboxHelperText>
              )}
            </Combobox>
          )}
        />

        <SheetFooter className="pt-2">
          <Button
            priority="secondary"
            type="button"
            onClick={(e) => handleCloseSheet(e)}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            disabled={!form.formState.isDirty}
            type="submit">
            {t('Utils.Validate')}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
};
