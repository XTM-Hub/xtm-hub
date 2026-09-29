import EeBadge from '@/components/service/document/one-click-deploy/EeBadge';
import { ReachSalesMutation } from '@/components/service/trial-instances/reach-sales.graphql';
import { useTranslate } from '@/hooks/use-translate';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
  toast,
} from '@filigran/ui';
import { Separator } from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { reachSalesMutation as ReachSalesMutationType } from '@generated/reachSalesMutation.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';

interface EeLearnMoreSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  serviceInstanceId: string;
  platformIdentifier: PlatformIdentifier;
}

const EE_OPENCTI_LEARN_MORE_URL =
  'https://filigran.io/offerings/opencti-enterprise-edition/';

const interestFormSchema = z.object({
  message: z.string().min(1, 'Required'),
});

const EeLearnMoreSheet = ({
  open,
  setOpen,
  serviceInstanceId,
  platformIdentifier,
}: EeLearnMoreSheetProps) => {
  const t = useTranslate();
  const defaultMessage = t(
    'Service.ShareableResources.Deploy.EELearnMore.DefaultMessage'
  );

  const form = useForm<z.infer<typeof interestFormSchema>>({
    resolver: zodResolver(interestFormSchema),
    defaultValues: { message: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ message: '' });
    }
  }, [open, form]);

  const [commitContactUs, isInFlight] =
    useMutation<ReachSalesMutationType>(ReachSalesMutation);

  const message = useWatch({
    control: form.control,
    name: 'message',
  });

  const handleSubmit = (values: z.infer<typeof interestFormSchema>) => {
    commitContactUs({
      variables: {
        message: values.message,
        platformId: serviceInstanceId,
        platformIdentifier,
      },
      onError(error) {
        toast({
          variant: 'destructive',
          title: t('Utils.Error'),
          description: t(`Error.Server.${error.message}`),
        });
      },
      onCompleted() {
        toast({
          title: t('Service.Trials.ReachOutToSalesSuccessTitle'),
          description: t('Service.Trials.ReachOutToSalesSuccessMessage'),
        });
        setOpen(false);
      },
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}>
      <SheetContent side="right">
        <SheetHeader className="pl-xl">
          <div className="flex items-center gap-s">
            <SheetTitle>
              {t('Service.ShareableResources.Deploy.EELearnMore.Title')}
            </SheetTitle>
            <EeBadge />
          </div>
          <SheetDescription>
            {t('Service.ShareableResources.Deploy.EELearnMore.Subtitle')}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col min-h-full pb-l">
          <div className="flex flex-col gap-l">
            <p className="text-sm font-semibold">
              {t('Service.ShareableResources.Deploy.EELearnMore.Heading')}
            </p>
            <p className="text-sm text-text-secondary">
              {t(
                'Service.ShareableResources.Deploy.EELearnMore.FirstParagraph'
              )}
            </p>
            <p className="text-sm text-text-secondary">
              {t(
                'Service.ShareableResources.Deploy.EELearnMore.SecondParagraph'
              )}
            </p>
          </div>
          <div className="mt-auto flex flex-col gap-xl">
            <Separator />
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold mb-s">
                {t(
                  'Service.ShareableResources.Deploy.EELearnMore.EnterpriseEditionTitle'
                )}
              </h3>
              <p className="text-sm text-text-secondary">
                {t(
                  'Service.ShareableResources.Deploy.EELearnMore.EnterpriseEditionDescription'
                )}
              </p>
              <Link
                target="_blank"
                rel="noopener noreferrer"
                href={EE_OPENCTI_LEARN_MORE_URL}
                className="text-sm underline text-primary w-fit">
                {t('Service.ShareableResources.Deploy.EELearnMore.Link')}
              </Link>
            </div>
            <div className="flex flex-col gap-s">
              <h3 className="text-sm font-semibold">
                {t(
                  'Service.ShareableResources.Deploy.EELearnMore.InterestedTitle'
                )}
              </h3>
              <p className="text-sm text-text-secondary">
                {t(
                  'Service.ShareableResources.Deploy.EELearnMore.InterestedSubtitle'
                )}
              </p>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="flex flex-col gap-s">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder={defaultMessage}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isInFlight || !message?.trim()}>
                      {t(
                        'Service.ShareableResources.Deploy.EELearnMore.SendButton'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EeLearnMoreSheet;
