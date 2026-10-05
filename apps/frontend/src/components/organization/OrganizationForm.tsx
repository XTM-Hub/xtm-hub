import { organizationFormSchema } from '@/components/organization/OrganizationForm.schema';
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  SheetFooter,
  Tag,
  TagInput,
} from '@filigran/ui';
import { organizationItem_fragment$data } from '@generated/organizationItem_fragment.graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
  const [tags, setTags] = useState<Tag[]>(
    (organization?.domains ?? []).map(
      (domain) => ({ id: domain, text: domain }) as Tag
    )
  );
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

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

  return (
    <Form {...form}>
      <form
        className="w-full space-y-xl"
        onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('OrganizationForm.Name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('OrganizationForm.Name')}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="domains"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start">
              <FormLabel className="text-left">
                {t('OrganizationForm.Domains')}
              </FormLabel>
              <FormControl>
                <TagInput
                  {...field}
                  placeholder={t('OrganizationForm.DomainsPlaceholder')}
                  tags={tags}
                  validateTag={validTagDomain}
                  className="sm:min-w-[450px]"
                  activeTagIndex={activeTagIndex}
                  setActiveTagIndex={setActiveTagIndex}
                  setTags={(newTags) => {
                    const newTagsText: string[] = (newTags as Tag[]).map(
                      (tag) => tag.text
                    );
                    setTags(newTags);
                    setValue('domains', newTagsText, {
                      shouldDirty: true,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SheetFooter className="pt-2">
          <Button
            variant="secondary"
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
