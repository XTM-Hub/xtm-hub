import { CheckIndeterminateIcon } from '@filigran/icon';

interface ShareableResourceIncompatibleWarningProps {
  message: string;
}

export const ShareableResourceIncompatibleWarning = ({
  message,
}: ShareableResourceIncompatibleWarningProps) => {
  return (
    <div className="border border-solid border-alert-warning rounded text-feedback-warning-primary flex gap-1 p-2">
      <CheckIndeterminateIcon
        aria-hidden={true}
        className="shrink-0 h-6 w-6"
      />
      {message}
    </div>
  );
};
