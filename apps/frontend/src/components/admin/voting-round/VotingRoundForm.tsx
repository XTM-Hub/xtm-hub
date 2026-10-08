import { RoadmapServiceInstance } from '@/components/admin/voting-round/use-roadmap-service-instances';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField } from '@/components/ui/SelectField';
import { useTranslate } from '@/hooks/use-translate';
import { Button, Input, Textarea } from '@filigran/design-system';
import { Form, FormField, SheetFooter } from '@filigran/ui';
import { VotingRoundTheme } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface VotingRoundFormModel {
  id: string;
  service_instance_id: string;
  name: string;
  description?: string | null;
  theme?: string | null;
}

const THEME_VALUES = Object.values(VotingRoundTheme) as [
  VotingRoundTheme,
  ...VotingRoundTheme[],
];

export interface VotingRoundCopySource {
  id: string;
  name: string;
}

export const votingRoundFormSchema = z.object({
  service_instance_id: z.string().min(1, {
    error: 'VotingRound.Form.Error.ServiceInstance',
  }),
  name: z.string().min(2, {
    error: 'VotingRound.Form.Error.Name',
  }),
  description: z.string().optional(),
  theme: z.enum(THEME_VALUES),
  copy_features_from_round_id: z.string().optional(),
});

const NO_COPY = 'none';

const VotingRoundForm = ({
  votingRound,
  copySources = [],
  serviceInstances = [],
  onClose,
  handleDelete,
  handleSubmit,
}: {
  votingRound?: VotingRoundFormModel;
  copySources?: VotingRoundCopySource[];
  serviceInstances?: RoadmapServiceInstance[];
  onClose: () => void;
  handleDelete?: () => void;
  handleSubmit: (values: z.infer<typeof votingRoundFormSchema>) => void;
}) => {
  const t = useTranslate();
  const form = useForm<z.infer<typeof votingRoundFormSchema>>({
    resolver: zodResolver(votingRoundFormSchema),
    defaultValues: {
      service_instance_id:
        votingRound?.service_instance_id ?? serviceInstances[0]?.id ?? '',
      name: votingRound?.name ?? '',
      description: votingRound?.description ?? '',
      theme:
        (votingRound?.theme as VotingRoundTheme | undefined) ??
        VotingRoundTheme.Default,
      copy_features_from_round_id: undefined,
    },
  });

  return (
    <Form {...form}>
      <form
        className="w-full space-y-xl"
        onSubmit={form.handleSubmit(handleSubmit)}>
        {!votingRound && (
          <FormField
            control={form.control}
            name="service_instance_id"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('VotingRound.Form.ServiceInstance')}
                placeholder={t('VotingRound.Form.ServiceInstancePlaceholder')}
                options={serviceInstances.map((serviceInstance) => ({
                  value: serviceInstance.id,
                  label: serviceInstance.name,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label={t('VotingRound.Form.Name')}
              placeholder={t('VotingRound.Form.Name')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Textarea
              label={t('VotingRound.Form.Description')}
              placeholder={t('VotingRound.Form.DescriptionPlaceholder')}
              error={fieldState.error?.message}
              {...field}
            />
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('VotingRound.Form.Theme')}
              options={THEME_VALUES.map((themeValue) => ({
                value: themeValue,
                label: t(`VotingRound.Theme.${themeValue}`),
              }))}
              value={field.value}
              onValueChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        {!votingRound && copySources.length > 0 && (
          <FormField
            control={form.control}
            name="copy_features_from_round_id"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('VotingRound.Form.CopyFeaturesFrom')}
                placeholder={t('VotingRound.Form.CopyFeaturesNone')}
                options={[
                  {
                    value: NO_COPY,
                    label: t('VotingRound.Form.CopyFeaturesNone'),
                  },
                  ...copySources.map((source) => ({
                    value: source.id,
                    label: source.name,
                  })),
                ]}
                value={field.value ?? NO_COPY}
                onValueChange={(value) =>
                  field.onChange(value === NO_COPY ? undefined : value)
                }
                error={fieldState.error?.message}
              />
            )}
          />
        )}
        <SheetFooter
          className={votingRound ? 'sm:justify-between pb-0' : 'pt-2'}>
          {votingRound && (
            <ConfirmDialog
              title={t('MenuActions.Delete')}
              confirmLabel={t('MenuActions.Delete')}
              destructive
              trigger={
                <Button
                  variant="destructive"
                  priority="secondary">
                  {t('MenuActions.Delete')}
                </Button>
              }
              onConfirm={() => handleDelete!()}>
              {t('VotingRound.Dialog.DeleteRound', { name: votingRound.name })}
            </ConfirmDialog>
          )}
          <div className="flex gap-s">
            <Button
              priority="secondary"
              type="button"
              onClick={onClose}>
              {t('Utils.Cancel')}
            </Button>
            <Button
              disabled={!form.formState.isDirty}
              type="submit">
              {t('Utils.Validate')}
            </Button>
          </div>
        </SheetFooter>
      </form>
    </Form>
  );
};

export default VotingRoundForm;
