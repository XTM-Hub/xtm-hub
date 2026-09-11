'use client';

import { EditionTypeMapping } from '@/components/epic/epic-item/EditionTypeMapping';
import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import {
  EPIC_SLACK_LINK_OPTIONS,
  EPIC_SLACK_LINK_REGEX,
} from '@/components/epic/epic-slack-links';
import {
  FILIGRAN_PRODUCTS_ORDER,
  sortFiligranProducts,
} from '@/components/epic/filigran-products';
import { ServiceFormDescriptionField } from '@/components/service/form/DescriptionField';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import {
  AutoForm,
  Button,
  FileInput,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import {
  EditionType,
  EpicType,
  FiligranProduct,
  Timeline,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

export const descriptionValue =
  ' [Long Description] - no limit of chars\n' +
  '### Problem to Solve\n' +
  '            \n' +
  'Description of pain point(s) felt by the user that this Epic is solving. This pain must be specific to this Epic (not a generic, high level pain such as “*Lack of visibility in my threat landscape*”)\n' +
  '         \n' +
  '### Proposed Solution\n' +
  'What we are introducing to solve the problem\n' +
  '\n' +
  '### Expected Value\n' +
  'Short point-form list (3-5 points) of what a customer will now be able to do and the value to be gained.\n' +
  "'If EPIC is aimed at a specific persona, worth mentioning it here.\n";
export const TIMELINE_VALUES = Object.values(Timeline);
export const FILIGRAN_PRODUCTS_OPTIONS = FILIGRAN_PRODUCTS_ORDER.map(
  (product) => ({
    id: product,
    label: FiligranProductMapping[product].name,
  })
);

const buildEpicFormSchema = (t: (key: string) => string) =>
  z.object({
    product: z
      .array(z.enum(FILIGRAN_PRODUCTS_ORDER))
      .min(1, t('EpicForm.Error.Product')),
    edition_type: z.enum(EditionType),
    title: z.string().min(2, t('EpicForm.Error.Title')).max(160),
    short_description: z
      .string()
      .min(1, t('EpicForm.Error.ShortDescription'))
      .max(215, t('EpicForm.Error.ShortDescriptionMax')),
    description: z.string().min(1, t('EpicForm.Error.Description')),
    timeline: z.enum(TIMELINE_VALUES),
    active: z.boolean().optional(),
    is_integration: z.boolean().optional(),
    illustration_document: z.custom<FileList>().optional(),
    slack_link: z
      .string()
      .regex(EPIC_SLACK_LINK_REGEX, t('EpicForm.Error.SlackLink'))
      .or(z.literal(''))
      .optional(),
  });

export const epicFormSchema = buildEpicFormSchema((key) => key);

const EpicForm = ({
  epic,
  handleSubmit,
}: {
  epic?: epic_fragment$data;
  handleSubmit: (values: z.infer<typeof epicFormSchema>) => void;
}) => {
  const t = useTranslations();
  const formSchema = useMemo(() => buildEpicFormSchema(t), [t]);

  const [isIntegration, setIsIntegration] = useState(
    epic?.epic_type === EpicType.Integration
  );

  return (
    <AutoForm
      onSubmit={(values) => handleSubmit(values)}
      onValuesChange={(values) => {
        setIsIntegration(values.is_integration ?? false);
      }}
      formSchema={formSchema}
      values={{
        title: epic?.title ?? '',
        short_description: epic?.short_description ?? '',
        description: epic?.description ?? descriptionValue,
        edition_type:
          (epic?.edition_type as EditionType) ?? EditionType.CommunityEdition,
        product: sortFiligranProducts(
          (epic?.product as FiligranProduct[]) ?? [FiligranProduct.Opencti]
        ),
        slack_link: epic?.slack_link ?? '',
        timeline: (epic?.timeline as Timeline) ?? Timeline.Now,
        active: epic?.active ?? false,
        is_integration: epic?.epic_type === EpicType.Integration,
        illustration_document: undefined,
      }}
      fieldConfig={{
        title: {
          inputProps: {
            placeholder: t('Epic.Form.IsLimited', { maxChars: '160' }),
          },
        },
        short_description: {
          label: t('Epic.Form.ShortDesc'),
          inputProps: {
            placeholder: t('Epic.Form.IsLimited', { maxChars: '215' }),
          },
        },
        description: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <>
              <ServiceFormDescriptionField
                field={field}
                documentType={'Epic'}
                required
              />
            </>
          ),
        },
        product: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <FormLabel>
                {t('Epic.Form.FiligranProduct')}
                <span className="text-sm text-destructive"> *</span>
              </FormLabel>
              <FormControl>
                <MultiSelectFormField
                  options={FILIGRAN_PRODUCTS_OPTIONS}
                  popoverContentClassName="bg-elevation-background-layer-3"
                  keyValue="id"
                  keyLabel="label"
                  defaultValue={field.value}
                  value={field.value}
                  onValueChange={(products) =>
                    field.onChange(sortFiligranProducts(products))
                  }
                  noResultString={t('Utils.NotFound')}
                  placeholder={t('Epic.Form.FiligranProduct')}
                  variant="inverted"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ),
        },
        slack_link: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <FormLabel>{t('Epic.Form.SlackLink')}</FormLabel>
              <FormControl>
                <AutocompleteInput
                  options={EPIC_SLACK_LINK_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('Epic.Form.SlackLinkPlaceholder')}
                  listLabel={t('Epic.Form.SlackLink')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ),
        },
        timeline: {
          fieldType: ({
            field,
          }: {
            field: ControllerRenderProps<FieldValues, string>;
          }) => (
            <FormItem>
              <FormLabel>
                {t('Epic.Form.Timeline')}
                <span className="text-sm text-destructive"> *</span>
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={epic?.timeline ?? Timeline.Now}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Epic.Timeline.now')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(Timeline).map((timeline) => {
                    return (
                      <SelectItem
                        key={timeline}
                        value={timeline}>
                        {t(`Epic.Timeline.${timeline.toLowerCase()}`)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          ),
        },
        illustration_document: {
          fieldType: ({ field }) => {
            if (!isIntegration) return null;
            return (
              <FormItem>
                <FormLabel>{t('Service.Form.Illustration')}</FormLabel>
                <FormControl>
                  <FileInput
                    {...field}
                    texts={{
                      selectFile: t('Service.Vault.FileForm.SelectDocument'),
                      noFile: t('Service.Vault.FileForm.NoDocument'),
                      dropFiles: t('Service.Vault.FileForm.DropDocuments'),
                    }}
                    allowedTypes={'image/jpeg, image/gif, image/png, image/svg'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          },
        },
        active: {
          label: t('Epic.Form.IsActive'),
        },
        is_integration: {
          label: t('Epic.Form.Integration'),
        },
        edition_type: {
          fieldType: ({ field }) => (
            <FormItem>
              <FormLabel>{t('Epic.Form.EditionType')}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? EditionType.CommunityEdition}
                  className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {Object.values(EditionType).map((value) => (
                    <FormItem
                      key={value}
                      className="flex flex-row items-center gap-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={value} />
                      </FormControl>
                      <FormLabel className="cursor-pointer font-normal">
                        {EditionTypeMapping[value].label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
            </FormItem>
          ),
        },
      }}>
      <div className="flex justify-end">
        <Button>{epic ? t('Utils.Update') : t('Utils.Create')}</Button>
      </div>
    </AutoForm>
  );
};

export default EpicForm;
