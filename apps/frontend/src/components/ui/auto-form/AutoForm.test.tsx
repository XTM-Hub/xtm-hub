import testRender from '@/utils/test/test-render';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AutoForm } from './AutoForm';
import type { AutoFormInputComponentProps } from './types';

const NAME_LABEL = 'Name';
const BEAUTIFIED_LABEL = 'First Name';
const PUBLISHED_LABEL = 'Published';
const COUNT_LABEL = 'Count';
const LICENSE_LABEL = 'License';
const NOTIFY_LABEL = 'Notify';
const ADDRESS_TRIGGER = 'Address';
const CITY_LABEL = 'City';
const SUBMIT_LABEL = 'Submit';
const SAVE_LABEL = 'Save';
const NAME_VALUE = 'Filigran';
const PADDED_NAME_VALUE = `  ${NAME_VALUE}  `;
const TYPED_TEXT = 'XTM';
const LICENSES = ['Free', 'Commercial'] as const;
const TAGS_KEY = 'tags';
const TAGS = ['threat', 'intel'];
const REQUIRED_STAR = '*';
const FORM_CLASS = 'mt-l';

const stringsSchema = z.object({
  name: z.string(),
  firstName: z.string().optional(),
});

describe('AutoForm', () => {
  it('should draw a textbox per string named by its label, or by the beautified key without one', () => {
    // Given / When
    testRender(
      <AutoForm
        formSchema={stringsSchema}
        fieldConfig={{ name: { label: NAME_LABEL } }}
      />
    );

    // Then
    expect(
      screen.getByRole('textbox', { name: NAME_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: BEAUTIFIED_LABEL })
    ).toBeInTheDocument();
  });

  it('should mark only the required string as required', () => {
    // Given / When
    testRender(
      <AutoForm
        formSchema={stringsSchema}
        fieldConfig={{ name: { label: NAME_LABEL } }}
      />
    );

    // Then
    expect(screen.getByRole('textbox', { name: NAME_LABEL })).toHaveAttribute(
      'aria-required',
      'true'
    );
    expect(
      screen.getByRole('textbox', { name: BEAUTIFIED_LABEL })
    ).not.toHaveAttribute('aria-required', 'true');
  });

  it('should draw a boolean as a checkbox and a number as a spinbutton', () => {
    // Given
    const formSchema = z.object({
      published: z.boolean().optional(),
      count: z.number().optional(),
    });

    // When
    testRender(
      <AutoForm
        formSchema={formSchema}
        fieldConfig={{
          published: { label: PUBLISHED_LABEL },
          count: { label: COUNT_LABEL },
        }}
      />
    );

    // Then
    expect(
      screen.getByRole('checkbox', { name: PUBLISHED_LABEL })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('spinbutton', { name: COUNT_LABEL })
    ).toBeInTheDocument();
  });

  it('should prefill the fields from values', () => {
    // Given / When
    testRender(
      <AutoForm
        formSchema={stringsSchema}
        values={{ name: NAME_VALUE }}
        fieldConfig={{ name: { label: NAME_LABEL } }}
      />
    );

    // Then
    expect(screen.getByRole('textbox', { name: NAME_LABEL })).toHaveValue(
      NAME_VALUE
    );
  });

  it('should submit the values parsed by the schema', async () => {
    // Given
    const formSchema = z.object({ name: z.string().trim() });
    const onSubmit = vi.fn();
    const { user } = testRender(
      <AutoForm
        formSchema={formSchema}
        values={{ name: PADDED_NAME_VALUE }}
        fieldConfig={{ name: { label: NAME_LABEL } }}
        onSubmit={onSubmit}>
        <button type="submit">{SUBMIT_LABEL}</button>
      </AutoForm>
    );

    // When
    await user.click(screen.getByRole('button', { name: SUBMIT_LABEL }));

    // Then
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        { name: NAME_VALUE },
        expect.anything()
      )
    );
  });

  it('should call onValuesChange with the values when the user types', async () => {
    // Given
    const onValuesChange = vi.fn();
    const { user } = testRender(
      <AutoForm
        formSchema={stringsSchema}
        fieldConfig={{ name: { label: NAME_LABEL } }}
        onValuesChange={onValuesChange}
      />
    );

    // When
    await user.type(
      screen.getByRole('textbox', { name: NAME_LABEL }),
      TYPED_TEXT
    );

    // Then
    expect(onValuesChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: TYPED_TEXT }),
      expect.anything()
    );
  });

  it('should pass the formState to children given as a function', async () => {
    // Given
    const { user } = testRender(
      <AutoForm
        formSchema={stringsSchema}
        fieldConfig={{ name: { label: NAME_LABEL } }}>
        {({ isDirty }) => (
          <button
            type="submit"
            disabled={!isDirty}>
            {SAVE_LABEL}
          </button>
        )}
      </AutoForm>
    );
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeDisabled();

    // When
    await user.type(
      screen.getByRole('textbox', { name: NAME_LABEL }),
      TYPED_TEXT
    );

    // Then
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeEnabled();
  });

  it('should draw one radio per enum value and a hidden star when fieldType is radio', () => {
    // Given
    const formSchema = z.object({ license: z.enum(LICENSES) });

    // When
    testRender(
      <AutoForm
        formSchema={formSchema}
        fieldConfig={{ license: { label: LICENSE_LABEL, fieldType: 'radio' } }}
      />
    );

    // Then
    const group = screen.getByRole('radiogroup', { name: LICENSE_LABEL });
    expect(within(group).getAllByRole('radio')).toHaveLength(LICENSES.length);
    const label = screen.getByText(LICENSE_LABEL, { selector: 'label' });
    expect(within(label).getByText(REQUIRED_STAR)).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('should draw a switch named by its label when fieldType is switch', () => {
    // Given
    const formSchema = z.object({ notify: z.boolean().optional() });

    // When
    testRender(
      <AutoForm
        formSchema={formSchema}
        fieldConfig={{ notify: { label: NOTIFY_LABEL, fieldType: 'switch' } }}
      />
    );

    // Then
    expect(
      screen.getByRole('switch', { name: NOTIFY_LABEL })
    ).toBeInTheDocument();
  });

  it('should pass the field to a component fieldType on an array field', async () => {
    // Given
    const formSchema = z.object({ [TAGS_KEY]: z.array(z.string()) });
    const TagsField = ({ field, fieldProps }: AutoFormInputComponentProps) => (
      <p>{`${field.name}: ${(fieldProps.value as string[]).join(', ')}`}</p>
    );

    // When
    testRender(
      <AutoForm
        formSchema={formSchema}
        values={{ [TAGS_KEY]: TAGS }}
        fieldConfig={{ [TAGS_KEY]: { fieldType: TagsField } }}
      />
    );

    // Then
    expect(
      await screen.findByText(`${TAGS_KEY}: ${TAGS.join(', ')}`)
    ).toBeInTheDocument();
  });

  it('should show the fields of a nested object once its accordion trigger is clicked', async () => {
    // Given
    const formSchema = z.object({
      address: z.object({ city: z.string().optional() }),
    });
    const { user } = testRender(<AutoForm formSchema={formSchema} />);
    expect(
      screen.queryByRole('textbox', { name: CITY_LABEL })
    ).not.toBeInTheDocument();

    // When
    await user.click(screen.getByRole('button', { name: ADDRESS_TRIGGER }));

    // Then
    expect(screen.getByRole('textbox', { name: CITY_LABEL })).toBeVisible();
  });

  it('should add the className to the form', () => {
    // Given / When
    testRender(
      <AutoForm
        formSchema={stringsSchema}
        fieldConfig={{ name: { label: NAME_LABEL } }}
        className={FORM_CLASS}
      />
    );

    // Then
    expect(
      screen.getByRole('textbox', { name: NAME_LABEL }).closest('form')
    ).toHaveClass(FORM_CLASS);
  });
});
