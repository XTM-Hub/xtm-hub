import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@filigran/design-system';

export const SaasAdministrators = ({ emails }: { emails: string[] }) => {
  if (emails.length <= 1) {
    return <span className="truncate">{emails[0]}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="truncate"
          tabIndex={0}>
          {emails.join(', ')}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {emails.map((email) => (
          <div key={email}>{email}</div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
};
