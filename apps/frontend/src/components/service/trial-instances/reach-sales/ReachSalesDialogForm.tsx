import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
} from '@filigran/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();

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
        <DialogHeader>
          <DialogTitle>{t('Service.Trials.ReachOutToSales')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id="reach-sales-form"
            onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-input/text/label text-text-default-secondary text-xs">
                    {t('Service.Trials.ReachOutToSalesMessageLabel')}
                    <span>*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'Service.Trials.ReachOutToSalesMessagePlaceholder'
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter className="justify-end gap-s">
          <Button
            variant="outline"
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
