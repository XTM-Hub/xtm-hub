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
  Textarea,
} from '@filigran/ui';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import {
  EditionType,
  EpicType,
  FiligranProduct,
  Timeline,
} from '@graphql/generated';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import {
  ControllerRenderProps,
  FieldValues,
  useFormContext,
} from 'react-hook-form';
import { z } from 'zod';

const SHORT_DESCRIPTION_MAX_CHARS = 215;
const SECTION_MAX_CHARS = 500;
export const TIMELINE_VALUES = Object.values(Timeline);
export const FILIGRAN_PRODUCTS_OPTIONS = FILIGRAN_PRODUCTS_ORDER.map(
  (product) => ({
    id: product,
    label: FiligranProductMapping[product].name,
  })
);

const buildEpicFormSchema = (t: (key: string) => string) =>
  z.object({
    products: z
      .array(z.enum(FILIGRAN_PRODUCTS_ORDER))
      .min(1, t('EpicForm.Error.Product')),
    edition_type: z.enum(EditionType),
    title: z.string().min(2, t('EpicForm.Error.Title')).max(160),
    short_description: z
      .string()
      .min(1, t('EpicForm.Error.ShortDescription'))
      .max(
        SHORT_DESCRIPTION_MAX_CHARS,
        t('EpicForm.Error.ShortDescriptionMax')
      ),
    description: z
      .string()
      .max(SECTION_MAX_CHARS, t('EpicForm.Error.DescriptionMax')),
    problem_to_solve: z
      .string()
      .min(1, t('EpicForm.Error.ProblemToSolve'))
      .max(SECTION_MAX_CHARS, t('EpicForm.Error.ProblemToSolveMax')),
    proposed_solution: z
      .string()
      .min(1, t('EpicForm.Error.ProposedSolution'))
      .max(SECTION_MAX_CHARS, t('EpicForm.Error.ProposedSolutionMax')),
    expected_value: z
      .string()
      .min(1, t('EpicForm.Error.ExpectedValue'))
      .max(SECTION_MAX_CHARS, t('EpicForm.Error.ExpectedValueMax')),
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

type EpicFieldProps = {
  field: ControllerRenderProps<FieldValues, string>;
};

const makeTextareaFieldType = ({
  labelKey,
  maxChars,
  required = false,
}: {
  labelKey: string;
  maxChars: number;
  required?: boolean;
}) => {
  const TextareaFieldType = ({ field }: EpicFieldProps) => {
    const t = useTranslations();
    return (
      <FormItem>
        <FormLabel>
          {t(labelKey)}
          {required && <span className="text-sm text-destructive"> *</span>}
        </FormLabel>
        <FormControl>
          <Textarea
            {...field}
            value={field.value ?? ''}
            rows={1}
            className="field-sizing-content min-h-9 resize-none"
            placeholder={t('Epic.Form.IsLimited', { maxChars })}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    );
  };
  return TextareaFieldType;
};

const ShortDescriptionFieldType = makeTextareaFieldType({
  labelKey: 'Epic.Form.ShortDesc',
  maxChars: SHORT_DESCRIPTION_MAX_CHARS,
  required: true,
});
const DescriptionFieldType = makeTextareaFieldType({
  labelKey: 'Epic.Form.Description',
  maxChars: SECTION_MAX_CHARS,
});
const ProblemToSolveFieldType = makeTextareaFieldType({
  labelKey: 'Epic.Form.ProblemToSolve',
  maxChars: SECTION_MAX_CHARS,
  required: true,
});
const ProposedSolutionFieldType = makeTextareaFieldType({
  labelKey: 'Epic.Form.ProposedSolution',
  maxChars: SECTION_MAX_CHARS,
  required: true,
});
const ExpectedValueFieldType = makeTextareaFieldType({
  labelKey: 'Epic.Form.ExpectedValue',
  maxChars: SECTION_MAX_CHARS,
  required: true,
});

const ProductsFieldType = ({ field }: EpicFieldProps) => {
  const t = useTranslations();
  return (
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
  );
};

const SlackLinkFieldType = ({ field }: EpicFieldProps) => {
  const t = useTranslations();
  return (
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
  );
};

const TimelineFieldType = ({ field }: EpicFieldProps) => {
  const t = useTranslations();
  return (
    <FormItem>
      <FormLabel>
        {t('Epic.Form.Timeline')}
        <span className="text-sm text-destructive"> *</span>
      </FormLabel>
      <Select
        onValueChange={field.onChange}
        value={field.value ?? Timeline.Now}>
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
  );
};

const IllustrationDocumentFieldType = ({ field }: EpicFieldProps) => {
  const t = useTranslations();
  const { watch } = useFormContext();
  const isIntegration = watch('is_integration');
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
};

const EditionTypeFieldType = ({ field }: EpicFieldProps) => {
  const t = useTranslations();
  return (
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
  );
};

const EpicForm = ({
  epic,
  handleSubmit,
}: {
  epic?: epic_fragment$data;
  handleSubmit: (values: z.infer<typeof epicFormSchema>) => void;
}) => {
  const t = useTranslations();
  const formSchema = useMemo(() => buildEpicFormSchema(t), [t]);

  const values = useMemo(
    () => ({
      title: epic?.title ?? '',
      short_description: epic?.short_description ?? '',
      description: epic?.description ?? '',
      problem_to_solve: epic?.problem_to_solve ?? '',
      proposed_solution: epic?.proposed_solution ?? '',
      expected_value: epic?.expected_value ?? '',
      edition_type:
        (epic?.edition_type as EditionType) ?? EditionType.CommunityEdition,
      products: sortFiligranProducts(
        (epic?.products as FiligranProduct[]) ?? [FiligranProduct.Opencti]
      ),
      slack_link: epic?.slack_link ?? '',
      timeline: (epic?.timeline as Timeline) ?? Timeline.Now,
      active: epic?.active ?? false,
      is_integration: epic?.epic_type === EpicType.Integration,
      illustration_document: undefined,
    }),
    [
      epic?.title,
      epic?.short_description,
      epic?.description,
      epic?.problem_to_solve,
      epic?.proposed_solution,
      epic?.expected_value,
      epic?.edition_type,
      epic?.products,
      epic?.slack_link,
      epic?.timeline,
      epic?.active,
      epic?.epic_type,
    ]
  );

  return (
    <AutoForm
      onSubmit={(values) => handleSubmit(values)}
      formSchema={formSchema}
      values={values}
      fieldConfig={{
        title: {
          inputProps: {
            placeholder: t('Epic.Form.IsLimited', { maxChars: '160' }),
          },
        },
        short_description: {
          fieldType: ShortDescriptionFieldType,
        },
        description: {
          fieldType: DescriptionFieldType,
        },
        problem_to_solve: {
          fieldType: ProblemToSolveFieldType,
        },
        proposed_solution: {
          fieldType: ProposedSolutionFieldType,
        },
        expected_value: {
          fieldType: ExpectedValueFieldType,
        },
        products: {
          fieldType: ProductsFieldType,
        },
        slack_link: {
          fieldType: SlackLinkFieldType,
        },
        timeline: {
          fieldType: TimelineFieldType,
        },
        illustration_document: {
          fieldType: IllustrationDocumentFieldType,
        },
        active: {
          label: t('Epic.Form.IsActive'),
        },
        is_integration: {
          label: t('Epic.Form.Integration'),
        },
        edition_type: {
          fieldType: EditionTypeFieldType,
        },
      }}>
      <div className="flex justify-end">
        <Button>{epic ? t('Utils.Update') : t('Utils.Create')}</Button>
      </div>
    </AutoForm>
  );
};

export default EpicForm;
