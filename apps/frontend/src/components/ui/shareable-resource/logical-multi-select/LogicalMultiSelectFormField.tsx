import { Checkbox } from '@filigran/ui';
import * as React from 'react';
import { useMemo } from 'react';

type Selection = Record<string, string[]>;
type FlatOption =
  | { type: 'parent'; value: string; label: string }
  | { type: 'child'; value: string; label: string; parentValue: string };

const isSelection = (item: unknown): item is Selection => {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return false;
  }

  return Object.values(item).every(
    (value) => Array.isArray(value) && value.every((v) => typeof v === 'string')
  );
};

interface MultiSelectFormFieldProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<string, any> = Record<string, any>,
> extends React.HTMLAttributes<HTMLDivElement> {
  options: T[];
  keyLabel?: keyof T;
  keyValue?: keyof T;
  keyChildren?: keyof T;
  initialValue?: Selection;
  noResultString: string;
  onValueChange: (value: Selection) => void;
  optionLabel: string;
  facetCounts?: Record<string, number>;
}

const LogicalMultiSelectFormField = React.forwardRef<
  HTMLDivElement,
  MultiSelectFormFieldProps
>(
  (
    {
      options,
      keyLabel = 'label',
      keyValue = 'value',
      keyChildren = 'children',
      initialValue,
      onValueChange,
      optionLabel,
      noResultString = 'No results found',
      facetCounts,
      ...props
    },
    ref
  ) => {
    const [selectedValues, setSelectedValues] = React.useState<Selection>(
      initialValue || {}
    );

    const flatOptions = useMemo<FlatOption[]>(() => {
      const res: FlatOption[] = [];
      for (const parent of options) {
        const parentValue = String(parent[keyValue]);
        const parentLabel = String(parent[keyLabel]);
        res.push({ type: 'parent', value: parentValue, label: parentLabel });
        const children = parent[keyChildren];
        if (Array.isArray(children)) {
          for (const child of children) {
            res.push({
              type: 'child',
              value: String(child[keyValue]),
              label: String(child[keyLabel]),
              parentValue,
            });
          }
        }
      }
      return res;
    }, [options, keyValue, keyLabel, keyChildren]);

    const getChildIdsForParent = (parentValue: string): string[] => {
      const parent = options.find((o) => String(o[keyValue]) === parentValue);
      if (!parent) return [];
      const children = (parent[keyChildren] ?? []) as typeof options;
      return children.map((child) => String(child[keyValue]));
    };

    const isParentFullySelected = (parentValue: string): boolean => {
      const childValues = selectedValues[parentValue];
      return childValues !== undefined && childValues.length === 0;
    };

    const isParentPartiallySelected = (parentValue: string): boolean => {
      const childIds = getChildIdsForParent(parentValue);
      if (childIds.length > 0 && parentValue in selectedValues) {
        const selectedChildren = selectedValues[parentValue];
        if (selectedChildren) {
          return (
            selectedChildren.length > 0 &&
            selectedChildren.length < childIds.length
          );
        }
      }
      return false;
    };

    const isChildSelected = (
      parentValue: string,
      childValue: string
    ): boolean => {
      const childValues = selectedValues[parentValue];
      if (childValues === undefined) return false;
      if (childValues.length === 0) return true;
      return childValues.includes(childValue);
    };

    const toggleChild = (childValue: string, parentValue: string) => {
      const newSelection = { ...selectedValues };
      const childIds = getChildIdsForParent(parentValue);
      const selectedChildren = newSelection[parentValue];

      if (selectedChildren === undefined) {
        newSelection[parentValue] =
          childIds.length === 1
            ? []
            : (newSelection[parentValue] = [childValue]);
      } else if (selectedChildren.length === 0) {
        const remaining = childIds.filter((id) => id !== childValue);
        if (remaining.length === 0) {
          delete newSelection[parentValue];
        } else {
          newSelection[parentValue] = remaining;
        }
      } else {
        if (selectedChildren.includes(childValue)) {
          const remaining = selectedChildren.filter((id) => id !== childValue);
          if (remaining.length === 0) {
            delete newSelection[parentValue];
          } else {
            newSelection[parentValue] = remaining;
          }
        } else {
          const updated = [...selectedChildren, childValue];
          if (childIds.every((id) => updated.includes(id))) {
            newSelection[parentValue] = [];
          } else {
            newSelection[parentValue] = updated;
          }
        }
      }
      setSelectedValues(newSelection);
      onValueChange(newSelection);
    };

    const toggleParent = (parentValue: string) => {
      const newSelection = { ...selectedValues };
      const childIds = getChildIdsForParent(parentValue);

      if (childIds.length === 0) {
        if (parentValue in newSelection) {
          delete newSelection[parentValue];
        } else {
          newSelection[parentValue] = [];
        }
      } else {
        if (
          parentValue in newSelection &&
          newSelection[parentValue]?.length === 0
        ) {
          delete newSelection[parentValue];
        } else {
          newSelection[parentValue] = [];
        }
      }

      setSelectedValues(newSelection);
      onValueChange(newSelection);
    };

    return (
      <div
        ref={ref}
        {...props}
        className="flex flex-col gap-s rounded-md border-0 p-0">
        <span className="sr-only">{optionLabel}</span>
        {flatOptions.length === 0 ? (
          <span className="text-sm text-text-default-secondary">
            {noResultString}
          </span>
        ) : (
          flatOptions.map((option) => {
            if (option.type === 'parent') {
              const checked = isParentFullySelected(option.value);
              const indeterminate = isParentPartiallySelected(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-center gap-s text-sm cursor-pointer">
                  <Checkbox
                    className="shrink-0"
                    checked={indeterminate ? 'indeterminate' : checked}
                    onCheckedChange={() => toggleParent(option.value)}
                  />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={option.label}>
                    {option.label}
                  </span>
                  {facetCounts && (
                    <span className="ml-auto shrink-0 rounded bg-elevation-surface-highlight-layer-0 px-1.5 content-body-compact text-text-default-secondary">
                      {facetCounts[option.value] ?? 0}
                    </span>
                  )}
                </label>
              );
            }

            const isSelected = isChildSelected(
              option.parentValue,
              option.value
            );

            return (
              <label
                key={`${option.parentValue}-${option.value}`}
                className="flex items-center gap-s pl-m text-sm cursor-pointer">
                <Checkbox
                  className="shrink-0"
                  checked={isSelected}
                  onCheckedChange={() =>
                    toggleChild(option.value, option.parentValue)
                  }
                />
                <span
                  className="min-w-0 flex-1 truncate"
                  title={option.label}>
                  {option.label}
                </span>
                {facetCounts && (
                  <span className="ml-auto shrink-0 rounded bg-elevation-surface-highlight-layer-0 px-1.5 content-body-compact text-text-default-secondary">
                    {facetCounts[option.value] ?? 0}
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>
    );
  }
);

LogicalMultiSelectFormField.displayName = 'LogicalMultiSelectFormField';

export {
  isSelection as isLogicalMultiSelectSelection,
  LogicalMultiSelectFormField,
};
export type { Selection as LogicalMultiSelectSelection };
