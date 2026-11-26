import { useEffect, useMemo, useState } from 'react';

export interface UseKeepSelectedOptionsParams<T> {
  /** The options of the current server search. */
  options: T[];
  /** The selected id, or the selected ids of a multiple combobox. */
  value: string | readonly string[] | null | undefined;
  /** Declared outside the component: a new function on each render recomputes the result. */
  getId: (option: T) => string;
  /** Options known before any search, such as the objects behind the initial value. */
  initialOptions?: readonly T[];
}

const toSelectedIds = (
  value: UseKeepSelectedOptionsParams<unknown>['value']
): readonly string[] => {
  if (!value) return [];
  return typeof value === 'string' ? [value] : value;
};

/**
 * Returns `options` followed by every selected option they lack, so a search
 * that narrows the results never turns a selection into a placeholder or a
 * raw id. A selected option is found among the options any earlier search
 * returned, then among `initialOptions`; one never seen is left out.
 */
export const useKeepSelectedOptions = <T>({
  options,
  value,
  getId,
  initialOptions,
}: UseKeepSelectedOptionsParams<T>): T[] => {
  const [seenOptionsById, setSeenOptionsById] = useState<
    ReadonlyMap<string, T>
  >(() => new Map());

  useEffect(() => {
    const unseenOptions = options.filter(
      (option) => !seenOptionsById.has(getId(option))
    );
    if (unseenOptions.length === 0) return;
    // Remembers every option shown, not only the selected ones: a pick can
    // reach `value` in the same render as the search reset that drops it.
    // Only a search that returns new options costs the extra render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeenOptionsById((previous) => {
      const next = new Map(previous);
      unseenOptions.forEach((option) => {
        const id = getId(option);
        if (!next.has(id)) next.set(id, option);
      });
      return next;
    });
  }, [options, seenOptionsById, getId]);

  return useMemo(() => {
    const optionIds = new Set(options.map(getId));
    const initialOptionsById = new Map(
      initialOptions?.map((option) => [getId(option), option])
    );
    const missingOptions = [...new Set(toSelectedIds(value))].flatMap((id) => {
      if (optionIds.has(id)) return [];
      const option = seenOptionsById.get(id) ?? initialOptionsById.get(id);
      return option === undefined ? [] : [option];
    });
    return missingOptions.length > 0
      ? [...options, ...missingOptions]
      : options;
  }, [options, value, getId, initialOptions, seenOptionsById]);
};
