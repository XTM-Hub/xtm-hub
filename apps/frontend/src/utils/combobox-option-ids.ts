export interface ComboboxOptionIds {
  ids: string[];
  getOptionLabel: (id: string) => string;
}

// A selected id without an option is labelled by the id itself: the last
// resort when no label for it was ever known.
export const toComboboxOptionIds = <T>(
  options: readonly T[],
  getId: (option: T) => string,
  getLabel: (option: T) => string
): ComboboxOptionIds => {
  const labelsById = new Map<string, string>();
  options.forEach((option) => {
    const id = getId(option);
    if (!labelsById.has(id)) labelsById.set(id, getLabel(option));
  });
  return {
    ids: [...labelsById.keys()],
    getOptionLabel: (id) => labelsById.get(id) ?? id,
  };
};
