import { Alert } from '@filigran/design-system';

interface ShareableResourceIncompatibleWarningProps {
  message: string;
  className?: string;
}

export const ShareableResourceIncompatibleWarning = ({
  message,
  className,
}: ShareableResourceIncompatibleWarningProps) => {
  return (
    <Alert
      severity="warning"
      title={message}
      className={className}
    />
  );
};
