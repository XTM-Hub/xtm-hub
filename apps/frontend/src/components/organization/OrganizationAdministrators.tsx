'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Button,
  Chip,
  Icon,
  IconButton,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { useId, useState } from 'react';
import { useCopyToClipboard } from 'usehooks-ts';

interface OrganizationAdministratorsProps {
  emails: string[] | null;
}

interface CopyEmailButtonProps {
  email: string;
  onCopy: (text: string) => void;
}

const CopyEmailButton = ({ email, onCopy }: CopyEmailButtonProps) => {
  const t = useTranslate();
  const label = t('OrganizationForm.CopyAdministratorEmail', { email });

  return (
    <Tooltip delayDuration={50}>
      <TooltipTrigger asChild>
        <IconButton
          {...analyticsId('admin_organization_administrator_copy')}
          priority="tertiary"
          size="sm"
          className="shrink-0"
          aria-label={label}
          icon={
            <Icon
              name="files"
              size={16}
            />
          }
          onClick={() => onCopy(email)}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};

export const OrganizationAdministrators = ({
  emails,
}: OrganizationAdministratorsProps) => {
  const t = useTranslate();
  const [, copy] = useCopyToClipboard();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const firstEmail = emails?.[0];

  if (!emails || firstEmail === undefined) {
    return (
      <span className="text-default-secondary">
        {t('OrganizationForm.NoAdministrator')}
      </span>
    );
  }

  const copyText = async (text: string) => {
    const copied = await copy(text);
    showSnackbar(
      copied
        ? { severity: 'success', title: t('Utils.Copied') }
        : { severity: 'error', title: t('Utils.FailedToCopy') }
    );
  };

  const otherCount = emails.length - 1;

  return (
    <TooltipProvider>
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate">{firstEmail}</span>
        <CopyEmailButton
          email={firstEmail}
          onCopy={copyText}
        />
        {otherCount > 0 && (
          <Popover
            open={open}
            onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Chip
                {...analyticsId('admin_organization_administrators_open')}
                label={`+${otherCount}`}
                aria-label={t('OrganizationForm.OtherAdministrators', {
                  count: otherCount,
                })}
              />
            </PopoverTrigger>
            <PopoverContent
              aria-labelledby={titleId}
              className="flex w-overlay-sm flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <Text
                  as="h2"
                  variant="title-sm"
                  id={titleId}>
                  {t('OrganizationForm.AdministratorsPopoverTitle', {
                    count: emails.length,
                  })}
                </Text>
                <IconButton
                  {...analyticsId('admin_organization_administrators_close')}
                  priority="tertiary"
                  size="sm"
                  aria-label={t('Utils.Close')}
                  icon={
                    <Icon
                      name="x"
                      size={16}
                    />
                  }
                  onClick={() => setOpen(false)}
                />
              </div>
              <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
                {emails.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between gap-2">
                    <span className="truncate">{email}</span>
                    <CopyEmailButton
                      email={email}
                      onCopy={copyText}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <Button
                  {...analyticsId('admin_organization_administrators_copy')}
                  priority="tertiary"
                  onClick={() => copyText(emails.join(', '))}>
                  {t('OrganizationForm.CopyAll')}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
};
