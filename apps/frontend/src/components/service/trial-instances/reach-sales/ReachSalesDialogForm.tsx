import { Form, FormField } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogTitle,
  Textarea,
} from '@filigran/design-system';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

interface ReachSalesDialogFormProps {
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  onSubmit: (message: string) => void;
}

const reachSalesSchema = z.object({
  message: z.string().min(1, 'Required'),
});

export const ReachSalesDialogForm = ({
  isDialogOpen,
  setIsDialogOpen,
  onSubmit,
}: ReachSalesDialogFormProps) => {
  const t = useTranslate();

  const form = useForm<z.infer<typeof reachSalesSchema>>({
    resolver: zodResolver(reachSalesSchema),
    defaultValues: {
      message: '',
    },
  });

  const message = useWatch({
    control: form.control,
    name: 'message',
  });

  const handleSubmit = (values: z.infer<typeof reachSalesSchema>) => {
    onSubmit(values.message);
    form.reset();
  };

  return (
    <Dialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}>
      <DialogContent>
        <DialogTitle>{t('Service.Trials.ReachOutToSales')}</DialogTitle>
        <DialogBody>
          <Form {...form}>
            <form
              id="reach-sales-form"
              noValidate
              onSubmit={form.handleSubmit(handleSubmit)}>
              <FormField
                control={form.control}
                name="message"
                render={({ field, fieldState }) => (
                  <Textarea
                    label={t('Service.Trials.ReachOutToSalesMessageLabel')}
                    required
                    placeholder={t(
                      'Service.Trials.ReachOutToSalesMessagePlaceholder'
                    )}
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button
            priority="secondary"
            type="button"
            onClick={() => setIsDialogOpen(false)}>
            {t('Utils.Cancel')}
          </Button>
          <Button
            type="submit"
            form="reach-sales-form"
            disabled={!message?.trim()}>
            {t('Service.Trials.ReachOutToSales')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
