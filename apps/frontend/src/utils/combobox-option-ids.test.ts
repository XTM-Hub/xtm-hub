import { describe, expect, it } from 'vitest';
import { toComboboxOptionIds } from './combobox-option-ids';

interface Option {
  id: string;
  name: string;
}

const FIRST_ID = 'option-1';
const FIRST_NAME = 'First option';
const SECOND_ID = 'option-2';
const SECOND_NAME = 'Second option';
const UNKNOWN_ID = 'unknown-option';

const OPTIONS: Option[] = [
  { id: FIRST_ID, name: FIRST_NAME },
  { id: SECOND_ID, name: SECOND_NAME },
];

const toIds = (options: Option[]) =>
  toComboboxOptionIds(
    options,
    (option) => option.id,
    (option) => option.name
  );

describe('toComboboxOptionIds', () => {
  it.each([
    {
      description: 'distinct ids',
      options: OPTIONS,
      expected: [FIRST_ID, SECOND_ID],
    },
    { description: 'no option', options: [], expected: [] },
    {
      description: 'a duplicated id',
      options: [...OPTIONS, { id: FIRST_ID, name: SECOND_NAME }],
      expected: [FIRST_ID, SECOND_ID],
    },
  ])(
    'should return the ids in option order, once each, when given $description',
    ({ options, expected }) => {
      // Given / When
      const { ids } = toIds(options);

      // Then
      expect(ids).toEqual(expected);
    }
  );

  it('should keep the first label when an id is duplicated', () => {
    // Given
    const { getOptionLabel } = toIds([
      ...OPTIONS,
      { id: FIRST_ID, name: SECOND_NAME },
    ]);

    // When
    const label = getOptionLabel(FIRST_ID);

    // Then
    expect(label).toBe(FIRST_NAME);
  });

  it.each([
    { id: FIRST_ID, expected: FIRST_NAME },
    { id: SECOND_ID, expected: SECOND_NAME },
    { id: UNKNOWN_ID, expected: UNKNOWN_ID },
    { id: '', expected: '' },
  ])(
    'should label $id as "$expected" when resolved against the options',
    ({ id, expected }) => {
      // Given
      const { getOptionLabel } = toIds(OPTIONS);

      // When
      const label = getOptionLabel(id);

      // Then
      expect(label).toBe(expected);
    }
  );
});
