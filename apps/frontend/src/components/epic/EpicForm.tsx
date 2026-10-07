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
import { useDialogContext } from '@/components/ui/SheetWithPreventingDialog';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Checkbox,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectContent,
  SelectHelperText,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { InfoIcon } from '@filigran/icon';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  MultiSelectFormField,
  Separator,
  SheetFooter,
} from '@filigran/ui';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import {
  EditionType,
  EpicType,
  FiligranProduct,
  Timeline,
} from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { Control, useForm } from 'react-hook-form';
import { z } from 'zod';

const TITLE_MAX_CHARS = 160;
const SHORT_DESCRIPTION_MAX_CHARS = 215;
const SECTION_MAX_CHARS = 500;
const TEXTAREA_MIN_ROWS = 4;

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
    timeline: z.enum(TIMELINE_VALUES),
    edition_type: z.enum(EditionType),
    is_integration: z.boolean().optional(),
    title: z.string().min(2, t('EpicForm.Error.Title')).max(TITLE_MAX_CHARS),
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
    slack_link: z
      .string()
      .regex(EPIC_SLACK_LINK_REGEX, t('EpicForm.Error.SlackLink'))
      .or(z.literal(''))
      .optional(),
    active: z.boolean().optional(),
  });

export const epicFormSchema = buildEpicFormSchema((key) => key);

type EpicFormValues = z.infer<typeof epicFormSchema>;
type EpicFormControl = Control<EpicFormValues>;
type EpicTextareaName =
  | 'short_description'
  | 'description'
  | 'problem_to_solve'
  | 'proposed_solution'
  | 'expected_value';

const EpicFieldLabel = ({
  labelKey,
  required = false,
  infoKey,
}: {
  labelKey: string;
  required?: boolean;
  infoKey?: string;
}) => {
  const t = useTranslate();
  return (
    <FormLabel className="flex items-center gap-xs">
      {t(labelKey)}
      {required && <span className="text-sm text-destructive">*</span>}
      {infoKey && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={t(infoKey)}
                className="text-muted-foreground">
                <InfoIcon className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t(infoKey)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </FormLabel>
  );
};

type CharacterLimitProps = {
  value: string;
  maxChars: number;
};

const CharacterCounter = ({ value, maxChars }: CharacterLimitProps) => {
  const t = useTranslate();
  return (
    <p className="text-muted-foreground txt-sub-content ml-auto shrink-0">
      {t('Epic.Form.CharacterCount', { count: value.length, maxChars })}
    </p>
  );
};

const EpicTextareaField = ({
  control,
  name,
  labelKey,
  placeholderKey,
  maxChars,
  required = false,
}: {
  control: EpicFormControl;
  name: EpicTextareaName;
  labelKey: string;
  placeholderKey: string;
  maxChars: number;
  required?: boolean;
}) => {
  const t = useTranslate();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-s">
          <Textarea
            label={t(labelKey)}
            required={required}
            {...field}
            value={field.value ?? ''}
            minRows={TEXTAREA_MIN_ROWS}
            resize="none"
            placeholder={t(placeholderKey)}
            error={fieldState.error?.message}
          />
          <CharacterCounter
            value={field.value ?? ''}
            maxChars={maxChars}
          />
        </div>
      )}
    />
  );
};

const EpicForm = ({
  epic,
  handleSubmit,
}: {
  epic?: epic_fragment$data;
  handleSubmit: (values: EpicFormValues) => void;
}) => {
  const t = useTranslate();
  const { handleCloseSheet } = useDialogContext();
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

  const form = useForm<EpicFormValues>({
    resolver: zodResolver(formSchema),
    values,
  });

  return (
    <Form {...form}>
      <form
        className="w-full space-y-l"
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="grid gap-l sm:grid-cols-2">
          <FormField
            control={form.control}
            name="products"
            render={({ field }) => (
              <FormItem>
                <EpicFieldLabel
                  labelKey="Epic.Form.FiligranProduct"
                  required
                />
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
            )}
          />
          <FormField
            control={form.control}
            name="timeline"
            render={({ field, fieldState }) => (
              <div>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? Timeline.Now}
                  error={Boolean(fieldState.error)}>
                  <SelectLabel required>{t('Epic.Form.Timeline')}</SelectLabel>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={t('Epic.Form.TimelineOption.now')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_VALUES.map((timeline) => (
                      <SelectItem
                        key={timeline}
                        value={timeline}>
                        {t(
                          `Epic.Form.TimelineOption.${timeline.toLowerCase()}`
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                  {fieldState.error && (
                    <SelectHelperText>
                      {fieldState.error.message}
                    </SelectHelperText>
                  )}
                </Select>
              </div>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="edition_type"
          render={({ field }) => (
            <FormItem>
              <EpicFieldLabel
                labelKey="Epic.Form.EditionType"
                infoKey="Epic.Form.EditionTypeInfo"
              />
              <div className="flex flex-wrap items-center gap-l">
                <FormControl>
                  <RadioGroup
                    orientation="horizontal"
                    className="flex-wrap"
                    aria-label={t('Epic.Form.EditionType')}
                    onValueChange={field.onChange}
                    value={field.value ?? EditionType.CommunityEdition}>
                    {Object.values(EditionType).map((value) => (
                      <Radio
                        key={value}
                        value={value}
                        label={EditionTypeMapping[value].label}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
                <Separator
                  orientation="vertical"
                  className="h-6"
                />
                <FormField
                  control={form.control}
                  name="is_integration"
                  render={({ field: integrationField }) => (
                    <Checkbox
                      label={t('Epic.Form.Integration')}
                      checked={integrationField.value ?? false}
                      onCheckedChange={integrationField.onChange}
                    />
                  )}
                />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-s">
              <Input
                label={t('Epic.Form.Title')}
                required
                {...field}
                value={field.value ?? ''}
                placeholder={t('Epic.Form.Placeholder.Title')}
                error={fieldState.error?.message}
              />
              <CharacterCounter
                value={field.value ?? ''}
                maxChars={TITLE_MAX_CHARS}
              />
            </div>
          )}
        />

        <EpicTextareaField
          control={form.control}
          name="short_description"
          labelKey="Epic.Form.ShortDesc"
          placeholderKey="Epic.Form.Placeholder.ShortDesc"
          maxChars={SHORT_DESCRIPTION_MAX_CHARS}
          required
        />

        <Separator />
        <p className="text-muted-foreground txt-category uppercase">
          {t('Epic.Form.DetailsSection')}
        </p>

        <EpicTextareaField
          control={form.control}
          name="description"
          labelKey="Epic.Form.Description"
          placeholderKey="Epic.Form.Placeholder.Description"
          maxChars={SECTION_MAX_CHARS}
        />
        <EpicTextareaField
          control={form.control}
          name="problem_to_solve"
          labelKey="Epic.Form.ProblemToSolve"
          placeholderKey="Epic.Form.Placeholder.ProblemToSolve"
          maxChars={SECTION_MAX_CHARS}
          required
        />
        <EpicTextareaField
          control={form.control}
          name="proposed_solution"
          labelKey="Epic.Form.ProposedSolution"
          placeholderKey="Epic.Form.Placeholder.ProposedSolution"
          maxChars={SECTION_MAX_CHARS}
          required
        />
        <EpicTextareaField
          control={form.control}
          name="expected_value"
          labelKey="Epic.Form.ExpectedValue"
          placeholderKey="Epic.Form.Placeholder.ExpectedValue"
          maxChars={SECTION_MAX_CHARS}
          required
        />

        <FormField
          control={form.control}
          name="slack_link"
          render={({ field, fieldState }) => (
            <AutocompleteInput
              label={t('Epic.Form.SlackLink')}
              options={EPIC_SLACK_LINK_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              placeholder={t('Epic.Form.SlackLinkPlaceholder')}
              listLabel={t('Epic.Form.SlackLink')}
              error={fieldState.error?.message}
            />
          )}
        />

        <SheetFooter className="bg-elevation-background-layer-2 sticky bottom-0 -mx-xl gap-l border-t px-xl py-m sm:items-center sm:justify-between">
          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <Checkbox
                label={t('Epic.Form.PublishNow')}
                description={t('Epic.Form.PublishNowHint')}
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div className="flex gap-s">
            <Button
              priority="secondary"
              type="button"
              onClick={handleCloseSheet}>
              {t('Utils.Cancel')}
            </Button>
            <Button type="submit">
              {t(
                epic
                  ? 'Epic.EpicActions.UpdateEpicButton'
                  : 'Epic.EpicActions.CreateEpicButton'
              )}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};

export default EpicForm;
