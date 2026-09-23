'use client';

import {
  buildEditFormValues,
  EditableTextFormValues,
  pickChangedValues,
} from '@/components/content-translation/content-edit-dialog.utils';
import { useContentTranslationApi } from '@/hooks/use-content-translation-api';
import { locales } from '@/i18n/config';
import { getStaticTranslationValue } from '@/utils/content-translation/get-static-translation-value';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
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
  // Fully-qualified content key, e.g. "PublicHomePage.XtmPlatform.Title".
  contentKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once the edited values are saved as drafts.
  onSaved: () => void;
}

// Dialog UI mounted by EditModeContentObserver for any t()-marked content
// key (fully-qualified, decoded from an invisible marker) — one per-locale
// tabbed form saving drafts, published later from EditionModeBanner.
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
  // Values loaded when the dialog opened, to save only what was edited.
  const [initialValues, setInitialValues] =
    useState<EditableTextFormValues>(emptyFormValues);

  useEffect(() => {
    if (!open) {
      return;
    }
    // Legitimate effect: fetch the per-locale DB values whenever the dialog
    // opens for a (possibly new) content key.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingValues(true);
    Promise.all(
      locales.map(async (locale) => ({
        locale,
        value: await getStaticTranslationValue(locale, contentKey),
      }))
    )
      .then(async (templates) => {
        const loadedValues = buildEditFormValues(
          templates,
          await loadValuesForKey(contentKey)
        );
        setInitialValues(loadedValues);
        form.reset(loadedValues);
      })
      .catch(() => {
        toast({ variant: 'destructive', title: tCommon('Utils.Error') });
      })
      .finally(() => setIsLoadingValues(false));
    // Only re-run when the dialog opens for a (possibly new) content key —
    // form/loadValuesForKey/tCommon identities aren't relevant re-run triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contentKey]);

  const handleSubmit = (values: EditableTextFormValues) => {
    const changedValues = pickChangedValues(values, initialValues);
    if (changedValues.length === 0) {
      onOpenChange(false);
      return;
    }
    saveDraft(contentKey, changedValues)
      // No success toast: toasts render at the top, over EditionModeBanner,
      // whose pending change count already confirms the save.
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
      {/* z-[110]: some pages (e.g. the sticky documents-list header) use a
          z-100 utility class, which would otherwise render above this
          dialog since @filigran/ui's DialogContent defaults to z-50. */}
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
                  className="flex flex-col gap-s">
                  {isLoadingValues ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <FormField
                      control={form.control}
                      name={locale}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {tCommon('EditableText.ValueLabel', {
                              locale: locale.toUpperCase(),
                            })}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
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
                  variant="secondary">
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
