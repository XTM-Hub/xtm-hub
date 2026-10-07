import { IntegrationsCsvExportDialog } from '@/components/service/components/header/IntegrationsCsvExportDialog';
import { useTranslate } from '@/hooks/use-translate';
import { buildSignupRedirect } from '@/utils/redirect';
import {
  IconButton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { DownloadIcon } from '@filigran/icon';
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
  const t = useTranslate();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(buildSignupRedirect(loginRedirectPath));
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
            <IconButton
              priority="secondary"
              aria-label={t('Service.CsvExport.TriggerButton')}
              icon={<DownloadIcon className="h-4 w-4" />}
              onClick={handleClick}></IconButton>
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
