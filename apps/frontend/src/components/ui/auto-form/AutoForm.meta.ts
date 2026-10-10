import type { ComponentMeta } from '@filigran/design-system/meta';

export const AutoFormMeta: ComponentMeta = {
  name: 'AutoForm',
  description:
    'A zod object schema rendered as react-hook-form fields drawn by the design system fields, inside the Form candidate. Each key of the schema becomes a field: string to Input, number to Input type number, boolean to Checkbox, date to DatePicker, enum to Select, a nested object to an Accordion item holding its own fields; an array renders only through a component fieldType. fieldConfig, keyed like the schema, sets each field label (else the key beautified: firstName gives "First Name"), its inputProps (placeholder, disabled, readOnly, accept, maxLength...) and its fieldType: a built-in renderer (checkbox, date, select, radio, switch, textarea, number, file) or a component receiving the field. A field is marked required unless its top-level schema is optional or nullable, or whenever inputProps.required is set. The schema validates on submit through zodResolver and onSubmit gets the parsed values; the fields stack with a 20px gap.',
  status: 'beta',
  category: 'inputs',
  version: '0.1.0',
  radixPrimitive: 'none',
  variants: ['default'],
  sizes: [],
  examples: [
    '<AutoForm formSchema={z.object({ name: z.string(), newsletter: z.boolean().optional(), role: z.enum(["Admin", "Member"]) })} fieldConfig={{ name: { label: t("Name") }, newsletter: { label: t("Newsletter") }, role: { label: t("Role"), inputProps: { placeholder: t("PickRole") } } }} onSubmit={(values) => save(values)}><Button type="submit">{t("Save")}</Button></AutoForm>',
    '<AutoForm formSchema={schema} values={{ license: entity?.license ?? "Free", tags: entity?.tags ?? [] }} fieldConfig={{ license: { label: t("License"), fieldType: "radio" }, tags: { label: t("Tags"), fieldType: ({ field }) => <TagsField {...field} /> } }} onSubmit={onSubmit} />',
    '<AutoForm formSchema={schema} onValuesChange={(values) => setDraft(values)} className="mt-l">{({ isValid, isDirty }) => <Button type="submit" disabled={!isValid || !isDirty}>{t("Save")}</Button>}</AutoForm>',
  ],
  props: {
    formSchema:
      'ZodObject or a schema wrapping one (refine, pipe) - the form shape, its validation and the default values it declares.',
    values:
      'z.infer<SchemaType> (optional) - the values to load, passed to useForm values: the form follows them when they change.',
    onValuesChange:
      '(values: Partial<z.infer<SchemaType>>, form: UseFormReturn) => void (optional) - called with the raw values on every change.',
    onSubmit:
      '(values: z.infer<SchemaType>, form: UseFormReturn) => void (optional) - called with the parsed values once the schema accepts them.',
    fieldConfig:
      'FieldConfig<z.infer<SchemaType>> (optional) - per field, keyed like the schema (nested for objects): label, inputProps spread on the field (the date field ignores them), fieldType (a built-in renderer name or a component receiving AutoFormInputComponentProps).',
    children:
      'ReactNode | (formState: FormState) => ReactNode (optional) - rendered after the fields inside the form, typically the submit button; as a function it gets the react-hook-form formState (isValid, isDirty...).',
    className:
      "string (optional) - merged with tailwind-merge over the form's space-y-5.",
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    notes:
      '1.3.1 Info and Relationships: the text, number, textarea, select, date, file, checkbox and switch fields are named by a label element pointed at the control; the RadioGroup is named through aria-label from its label, its visible label pointing at no labelable element. 3.3.2 Labels or Instructions: the text, number, textarea, date and file fields of a required key carry aria-required; the select, radio and switch labels draw the aria-hidden star only; the checkbox draws no required marker. 3.3.1 Error Identification: after a failed submit the text, number, textarea, select, radio, date and file fields show the error message as the description of the control, the invalid control carrying aria-invalid; the checkbox and switch draw no error message. Nested objects open from accordion buttons named after the field, with aria-expanded. The contrast pairs are those of the fields drawn.',
  },
};
