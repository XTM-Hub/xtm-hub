import AutoFormCheckbox from './fields/Checkbox';
import AutoFormDate from './fields/Date';
import AutoFormEnum from './fields/Enum';
import AutoFormFile from './fields/File';
import AutoFormInput from './fields/Input';
import AutoFormNumber from './fields/Number';
import AutoFormRadioGroup from './fields/RadioGroup';
import AutoFormSwitch from './fields/Switch';
import AutoFormTextarea from './fields/Textarea';

export const INPUT_COMPONENTS = {
  checkbox: AutoFormCheckbox,
  date: AutoFormDate,
  select: AutoFormEnum,
  radio: AutoFormRadioGroup,
  switch: AutoFormSwitch,
  textarea: AutoFormTextarea,
  number: AutoFormNumber,
  file: AutoFormFile,
  fallback: AutoFormInput,
};

/**
 * Define handlers for specific Zod types.
 * You can expand this object to support more types.
 */
export const DEFAULT_ZOD_HANDLERS: {
  [key: string]: keyof typeof INPUT_COMPONENTS;
} = {
  boolean: 'checkbox',
  date: 'date',
  enum: 'select',
  nativeEnum: 'select',
  number: 'number',
};
