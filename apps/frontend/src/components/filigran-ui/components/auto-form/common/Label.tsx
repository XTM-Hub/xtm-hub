import { FormLabel } from '@/components/filigran-ui/components/clients';
import { cn } from '@/components/filigran-ui/lib/utils';

const AutoFormLabel = ({
  label,
  isRequired,
  className,
}: {
  label: string;
  isRequired: boolean;
  className?: string;
}) => {
  return (
    <>
      <FormLabel className={cn(className)}>
        {label}
        {isRequired && <span className="text-destructive"> *</span>}
      </FormLabel>
    </>
  );
};

export default AutoFormLabel;
