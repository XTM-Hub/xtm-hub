'use client';

import {
  buildEditFormValues,
  EditableTextFormValues,
  getOriginalValues,
  pickChangedValues,
} from '@/components/content-translation/content-edit-dialog.utils';
import { useContentTranslationApi } from '@/hooks/use-content-translation-api';
import { Locale, locales } from '@/i18n/config';
import { getStaticTranslationValue } from '@/utils/content-translation/get-static-translation-value';
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@filigran/design-system';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormField,
  Skeleton,
  toast,
} from '@filigran/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const editableTextFormSchema = z.object({
  en: z.string(),
  fr: z.string(),
  ja: z.string(),
}) satisfies z.ZodType<EditableTextFormValues>;

const emptyFormValues: EditableTextFormValues = { en: '', fr: '', ja: '' };

export interface ContentEditDialogProps {
  contentKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export const ContentEditDialog = ({
  contentKey,
  open,
  onOpenChange,
  onSaved,
}: ContentEditDialogProps) => {
  const tCommon = useTranslations();
  const currentLocale = useLocale();
  const { loadValuesForKey, saveDraft, isSaving } = useContentTranslationApi();
  const [isLoadingValues, setIsLoadingValues] = useState(false);

  const form = useForm<EditableTextFormValues>({
    resolver: zodResolver(editableTextFormSchema),
    defaultValues: emptyFormValues,
  });
  const [initialValues, setInitialValues] =
    useState<EditableTextFormValues>(emptyFormValues);
  const [originalValues, setOriginalValues] = useState<
    Partial<Record<Locale, string>>
  >({});

  useEffect(() => {
    if (!open) {
      return;
    }
    // Legitimate effect: load the saved values when the dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingValues(true);
    Promise.all(
      locales.map(async (locale) => ({
        locale,
        value: await getStaticTranslationValue(locale, contentKey),
      }))
    )
      .then(async (templates) => {
        const savedValues = await loadValuesForKey(contentKey);
        const loadedValues = buildEditFormValues(templates, savedValues);
        setInitialValues(loadedValues);
        setOriginalValues(getOriginalValues(templates, savedValues));
        form.reset(loadedValues);
      })
      .catch(() => {
        toast({ variant: 'destructive', title: tCommon('Utils.Error') });
      })
      .finally(() => setIsLoadingValues(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentKey]);

  const handleSubmit = (values: EditableTextFormValues) => {
    const changedValues = pickChangedValues(values, initialValues);
    if (changedValues.length === 0) {
      onOpenChange(false);
      return;
    }
    saveDraft(contentKey, changedValues)
      // No success toast: it would cover the edit mode banner, whose pending
      // change count already confirms the save.
      .then(() => {
        onSaved();
        onOpenChange(false);
      })
      .catch(() => {
        toast({ variant: 'destructive', title: tCommon('Utils.Error') });
      });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      {/* Above the z-100 sticky headers some pages use. */}
      <DialogContent className="z-[110]">
        <DialogHeader className="gap-s">
          <DialogTitle>{tCommon('EditableText.DialogTitle')}</DialogTitle>
          <DialogDescription>
            {tCommon('EditableText.KeyLabel', { contentKey })}
          </DialogDescription>
          <p className="text-muted-foreground text-sm">
            {tCommon('EditableText.DraftHint')}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex flex-col gap-s"
            onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs defaultValue={currentLocale}>
              <TabsList>
                {locales.map((locale) => (
                  <TabsTrigger
                    key={locale}
                    value={locale}>
                    {locale.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {locales.map((locale) => (
                <TabsContent
                  key={locale}
                  value={locale}
                  className="flex flex-col gap-s pt-l">
                  {isLoadingValues ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <FormField
                      control={form.control}
                      name={locale}
                      render={({ field }) => (
                        <Textarea
                          label={tCommon('EditableText.ValueLabel', {
                            locale: locale.toUpperCase(),
                          })}
                          rows={4}
                          helperText={
                            originalValues[locale] !== undefined
                              ? tCommon('EditableText.OriginalValue', {
                                  value: originalValues[locale],
                                })
                              : undefined
                          }
                          {...field}
                        />
                      )}
                    />
                  )}
                </TabsContent>
              ))}
            </Tabs>

            <DialogFooter className="justify-end">
              <DialogClose asChild>
                <Button
                  type="button"
                  priority="secondary">
                  {tCommon('Utils.Cancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSaving || isLoadingValues}>
                {tCommon('EditableText.SaveDraft')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
