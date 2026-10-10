'use client';

import { formatTier } from '@/components/competitor/competitor.utils';
import { SelectField } from '@/components/ui/SelectField';
import { SheetFooter } from '@/components/ui/sheet';
import { useTranslate } from '@/hooks/use-translate';
import { Button } from '@filigran/design-system';
import { AutoForm, useFormField } from '@filigran/ui';
import { competitor_fragment$data } from '@generated/competitor_fragment.graphql';
import { CompetitorTier } from '@graphql/generated';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { z } from 'zod';

export const TIER_VALUES = Object.values(CompetitorTier);
export const TIERS = Object.values(CompetitorTier).map((tier) => ({
  value: tier,
  label: formatTier(tier),
}));

export const competitorFormSchema = z.object({
  name: z.string().min(2, { error: 'Name must be at least 2 characters.' }),
  domain: z
    .string()
    .min(2, { error: 'Domain must be at least 2 characters.' })
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/,
      { error: 'Domain must be a valid mail domain (e.g. example.com).' }
    ),
  tier: z.enum(TIER_VALUES),
});

const TierField = ({
  field,
  defaultTier,
}: {
  field: ControllerRenderProps<FieldValues, string>;
  defaultTier: string;
}) => {
  const t = useTranslate();
  const { error } = useFormField();

  return (
    <SelectField
      label={t('CompetitorForm.Tier')}
      required
      placeholder={t('CompetitorForm.Tier')}
      options={TIERS}
      value={field.value}
      defaultValue={defaultTier}
      onValueChange={field.onChange}
      error={error?.message}
      contentClassName="layer-2"
    />
  );
};

const CompetitorForm = ({
  competitor,
  handleSubmit,
  onClose,
}: {
  competitor?: competitor_fragment$data;
  handleSubmit: (values: z.infer<typeof competitorFormSchema>) => void;
  onClose: () => void;
}) => {
  const t = useTranslate();
  const isCreation = competitor === undefined;
  return (
    <AutoForm
      formSchema={competitorFormSchema}
      values={{
        name: competitor?.name ?? '',
        domain: competitor?.domain ?? '',
        tier: (competitor?.tier as CompetitorTier) ?? CompetitorTier.Tier1,
      }}
      onSubmit={(values) => handleSubmit(values)}
      fieldConfig={{
        name: {
          label: t('CompetitorForm.Name'),
          inputProps: {
            placeholder: t('CompetitorForm.Name'),
          },
        },
        domain: {
          label: t('CompetitorForm.Domain'),
          inputProps: {
            placeholder: t('CompetitorForm.Domain'),
          },
        },
        tier: {
          fieldType: ({ field }) => (
            <TierField
              field={field}
              defaultTier={competitor?.tier ?? CompetitorTier.Tier1}
            />
          ),
        },
      }}>
      <SheetFooter className={'sm:justify-end pb-0'}>
        <div className="flex gap-s">
          <Button
            priority="secondary"
            type="button"
            onClick={onClose}>
            {t('Utils.Cancel')}
          </Button>
          <Button type="submit">
            {isCreation
              ? t('CompetitorForm.AddButton')
              : t('CompetitorForm.EditButton')}
          </Button>
        </div>
      </SheetFooter>
    </AutoForm>
  );
};

export default CompetitorForm;
