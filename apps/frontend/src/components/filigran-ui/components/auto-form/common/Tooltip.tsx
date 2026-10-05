import type { FieldConfigItem } from '../types';

const AutoFormTooltip = ({
  fieldConfigItem,
}: {
  fieldConfigItem: FieldConfigItem;
}) => {
  return (
    <>
      {fieldConfigItem?.description && (
        <p className="text-sm text-muted-foreground">
          {fieldConfigItem.description}
        </p>
      )}
    </>
  );
};

export default AutoFormTooltip;
