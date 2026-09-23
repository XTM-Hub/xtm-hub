'use client';

import GuardCapacityComponent from '@/components/AdminGuard';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { useTranslate } from '@/hooks/use-translate';
import { Locale, locales } from '@/i18n/config';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { EditIcon } from '@filigran/icon';
import {
  AutoForm,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@filigran/ui';
import { toast } from '@filigran/ui/clients';
import {
  PortalCapability,
  SeoServiceInstanceLanguage,
  useEditSeoServiceInstanceMetadataMutation,
  useServiceInstanceSeoMetadataByIdQuery,
} from '@graphql/generated';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { z } from 'zod';

const SEO_METADATA_MAX_LENGTH = 155;
const optionalSeoField = z.string().max(SEO_METADATA_MAX_LENGTH).optional();

type SeoLocaleConfig = {
  language: SeoServiceInstanceLanguage;
  titleField: string;
  descriptionField: string;
  label: string;
};

const SEO_LANGUAGES = Object.values(SeoServiceInstanceLanguage);

const getSeoLanguageFromLocale = (
  locale: Locale
): SeoServiceInstanceLanguage => {
  const language = SEO_LANGUAGES.find((value) => value === locale);
  if (!language) {
    throw new Error(`Unsupported SEO locale: ${locale}`);
  }
  return language;
};

const SEO_LOCALES: SeoLocaleConfig[] = locales.map((locale) => {
  return {
    language: getSeoLanguageFromLocale(locale),
    titleField: `metaTitle${locale}`,
    descriptionField: `metaDescription${locale}`,
    label: locale.toUpperCase(),
  };
});

type LibraryUpdateFormValues = Record<string, string | undefined>;

const libraryUpdateSchema = z.object(
  SEO_LOCALES.reduce(
    (acc, { titleField, descriptionField }) => {
      acc[titleField] = optionalSeoField;
      acc[descriptionField] = optionalSeoField;
      return acc;
    },
    {} as Record<string, typeof optionalSeoField>
  )
);

const libraryUpdateDefaultValues = SEO_LOCALES.reduce(
  (acc, { titleField, descriptionField }) => {
    acc[titleField] = '';
    acc[descriptionField] = '';
    return acc;
  },
  {} as LibraryUpdateFormValues
);

type LibraryUpdateFieldConfig = Record<
  string,
  {
    label: string;
    inputProps: {
      maxLength: number;
    };
  }
>;

export const LibraryUpdateMetadata = () => {
  const t = useTranslate();
  const { serviceInstance } = useServiceContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const libraryUpdateFieldConfig = useMemo(
    () =>
      SEO_LOCALES.reduce((acc, { titleField, descriptionField, label }) => {
        acc[titleField] = {
          label: `${t('Metadata.SeoMetaTitle')} (${label})`,
          inputProps: { maxLength: SEO_METADATA_MAX_LENGTH },
        };
        acc[descriptionField] = {
          label: `${t('Metadata.SeoMetaDescription')} (${label})`,
          inputProps: { maxLength: SEO_METADATA_MAX_LENGTH },
        };
        return acc;
      }, {} as LibraryUpdateFieldConfig),
    [t]
  );
  const seoMetadataVariables = useMemo(
    () => ({
      service_instance_id: serviceInstance.id,
    }),
    [serviceInstance.id]
  );
  const { data } = useServiceInstanceSeoMetadataByIdQuery(
    portalGraphqlClient,
    seoMetadataVariables
  );

  const existingSeoMetadataByLocale = useMemo(() => {
    const seoServiceInstanceMetadata = data?.seoServiceInstanceMetadata ?? [];
    return seoServiceInstanceMetadata.reduce(
      (acc, metadata) => {
        const matchingLocale = SEO_LOCALES.find(
          ({ language }) => language === metadata.language
        );
        if (!matchingLocale) {
          return acc;
        }

        acc[matchingLocale.titleField] = metadata.meta_title;
        acc[matchingLocale.descriptionField] = metadata.meta_description;
        return acc;
      },
      { ...libraryUpdateDefaultValues }
    );
  }, [data?.seoServiceInstanceMetadata]);

  const { mutateAsync: editSeoServiceInstance } =
    useEditSeoServiceInstanceMetadataMutation(portalGraphqlClient);

  const handleSubmit = async (values: LibraryUpdateFormValues) => {
    try {
      await Promise.all(
        SEO_LOCALES.map(({ language, titleField, descriptionField }) =>
          editSeoServiceInstance({
            service_instance_id: serviceInstance.id,
            language,
            input: {
              meta_title: values[titleField] ?? '',
              meta_description: values[descriptionField] ?? '',
            },
          })
        )
      );
      setIsOpen(false);
      void queryClient.invalidateQueries({
        queryKey:
          useServiceInstanceSeoMetadataByIdQuery.getKey(seoMetadataVariables),
      });
      toast({
        title: t('Utils.Success'),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'UNKNOWN_ERROR';
      toast({
        variant: 'destructive',
        title: t('Utils.Error'),
        description: t(`Error.Server.${errorMessage}`),
      });
    }
  };

  return (
    <GuardCapacityComponent
      portalCapabilityRestriction={[PortalCapability.ModifyServiceMetadata]}>
      <>
        <Button
          variant="tertiary"
          onClick={() => setIsOpen(true)}>
          <EditIcon className="h-4 w-4 mr-s " />
          {t('Utils.Edit')}
        </Button>
        <Dialog
          open={isOpen}
          onOpenChange={setIsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader className="mb-s">
              <DialogTitle>{t('Metadata.SeoMetadata')}</DialogTitle>
            </DialogHeader>
            <AutoForm
              className="space-y-m"
              formSchema={libraryUpdateSchema}
              values={existingSeoMetadataByLocale}
              fieldConfig={libraryUpdateFieldConfig}
              onSubmit={handleSubmit}>
              <DialogFooter className="pt-s">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setIsOpen(false)}>
                  {t('Utils.Cancel')}
                </Button>
                <Button type="submit">{t('Utils.Validate')}</Button>
              </DialogFooter>
            </AutoForm>
          </DialogContent>
        </Dialog>
      </>
    </GuardCapacityComponent>
  );
};
