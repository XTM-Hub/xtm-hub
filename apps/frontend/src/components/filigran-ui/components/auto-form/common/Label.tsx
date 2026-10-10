import { cn } from '@/components/filigran-ui/lib/utils';
import { FormLabel } from '@/components/ui/form';

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
