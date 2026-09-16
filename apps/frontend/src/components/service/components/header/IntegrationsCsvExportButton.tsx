import { IntegrationsCsvExportDialog } from '@/components/service/components/header/IntegrationsCsvExportDialog';
import { buildLoginRedirect } from '@/utils/redirect';
import { DownloadIcon } from '@filigran/icon';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface IntegrationsCsvExportButtonProps {
  serviceInstanceId: string;
  isAuthenticated: boolean;
  loginRedirectPath?: string;
  type: string;
}

export const IntegrationsCsvExportButton = ({
  serviceInstanceId,
  isAuthenticated,
  loginRedirectPath,
  type,
}: IntegrationsCsvExportButtonProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(buildLoginRedirect(loginRedirectPath));
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip
          delayDuration={50}
          disableHoverableContent={true}>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label={t('Service.CsvExport.TriggerButton')}
              onClick={handleClick}>
              <DownloadIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('Service.CsvExport.TriggerButton')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isAuthenticated && (
        <IntegrationsCsvExportDialog
          open={open}
          setOpen={setOpen}
          serviceInstanceId={serviceInstanceId}
          type={type}
        />
      )}
    </>
  );
};

export default IntegrationsCsvExportButton;
