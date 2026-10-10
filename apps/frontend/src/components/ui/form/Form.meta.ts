import type { ComponentMeta } from '@filigran/design-system/meta';

export const FormMeta: ComponentMeta = {
  name: 'Form',
  description:
    'The react-hook-form binding for controls that do not draw their own label and error. Form provides the form, FormField binds a Controller to a field name, FormItem stacks its parts with an 8px gap, FormLabel is the Label candidate pointed at the control (with its required star), FormControl passes the id, aria-invalid and aria-describedby to its child through a Radix Slot, and FormMessage draws the field error as the design system helper row (content-caption in the input error colour). Design system fields that take `label`, `required` and `error` props draw these themselves and only need a bare FormField.',
  status: 'beta',
  category: 'inputs',
  version: '0.1.0',
  radixPrimitive: '@radix-ui/react-slot',
  variants: ['default', 'error', 'required'],
  sizes: [],
  examples: [
    '<Form {...form}><form onSubmit={form.handleSubmit(onSubmit)}><FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel required>Description</FormLabel><FormControl><input {...field} /></FormControl><FormMessage /></FormItem>)} /></form></Form>',
    '<FormField control={form.control} name="name" render={({ field, fieldState }) => (<Input {...field} label={t("Name")} required error={fieldState.error?.message} />)} />',
  ],
  props: {
    Form: 'UseFormReturn (on Form) - the react-hook-form methods, spread as <Form {...form}>; renders no element of its own.',
    FormField:
      'ControllerProps<TFieldValues, TName> (on FormField) - control, name, render and the other Controller props; provides the field name to the parts below it.',
    FormItem:
      'React.HTMLAttributes<HTMLDivElement> (on FormItem) - a <div> stacking its children with gap-2; className is merged last with tailwind-merge; the ref is forwarded to the <div>.',
    FormLabel:
      "Omit<LabelProps, 'error'> (on FormLabel) - the Label props: htmlFor is set to the control id and error follows the field state; required appends the aria-hidden star; the ref is forwarded to the <label>.",
    FormControl:
      "Slot props (on FormControl) - a single child, which receives id, aria-invalid and, while the field has an error, aria-describedby pointing at the message; the child's own id wins over the slot one.",
    FormMessage:
      'React.HTMLAttributes<HTMLParagraphElement> (on FormMessage) - a <p> showing the field error message, else its children, and nothing when both are empty; className is joined to the colour class (layout only).',
    useFormField:
      '() => { id, name, formItemId, formMessageId, invalid, isDirty, isTouched, isValidating, error } - the field state for custom parts; tolerates being called outside a FormField or FormItem.',
  },
  accessibility: {
    wcag: '2.1 AA',
    wcagStatus: 'pending',
    contrastPairs: [
      {
        id: 'error message on default elevation',
        fg: '--text-input-error',
        bg: '--bg-elevation-default',
        minRatio: 4.5,
      },
    ],
    notes:
      '1.3.1 Info and Relationships: FormLabel is a native <label> whose htmlFor names the FormControl child id. 3.3.1 Error Identification: the control carries aria-invalid, and aria-describedby points at the FormMessage only while the field has an error, so the message is announced with the control. The required star drawn by FormLabel is aria-hidden, as in the design system fields.',
  },
};
