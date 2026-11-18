import { Alert } from '@filigran/design-system';

interface ShareableResourceIncompatibleWarningProps {
  message: string;
}

export const ShareableResourceIncompatibleWarning = ({
  message,
}: ShareableResourceIncompatibleWarningProps) => {
  return (
    <Alert
      severity="warning"
      title={message}
    />
  );
};
