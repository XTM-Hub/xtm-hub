import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionContent,
  type AccordionContentProps,
  AccordionItem,
  AccordionTrigger,
  type AccordionTriggerProps,
} from './Accordion';

const FIRST_VALUE = 'general';
const FIRST_LABEL = 'General';
const FIRST_CONTENT = 'General settings';
const SECOND_VALUE = 'advanced';
const SECOND_LABEL = 'Advanced';
const SECOND_CONTENT = 'Advanced settings';
const NESTED_VALUE = 'products';
const NESTED_LABEL = 'My products';
const NESTED_CONTENT = 'OpenCTI platforms';
const TRIGGER_CLASSES = [
  'group/accordion-trigger',
  'flex',
  'flex-1',
  'cursor-pointer',
  'items-center',
  'justify-between',
  'gap-2',
  'py-2',
  'pr-2',
  'text-left',
  'focus-visible:outline-2',
  'focus-visible:-outline-offset-2',
  'outline-focus',
];
const CHEVRON_WRAPPER_TURN_CLASSES = [
  'transition-transform',
  'duration-150',
  'motion-reduce:transition-none',
  'group-data-[state=open]/accordion-trigger:rotate-180',
];
const ITEM_TEST_ID = 'accordion-item';
const CALLER_ITEM_CLASS = 'md:flex-1';
const TRIGGER_PADDING_Y_CLASS = 'py-2';
const TRIGGER_FOCUS_CLASS = 'outline-focus';
const TRIGGER_PADDING_RIGHT_CLASS = 'pr-2';
const CALLER_PADDING_RIGHT_CLASS = 'pr-0';
const CALLER_HEIGHT_CLASS = 'h-9';
const REGION_CLASSES = ['overflow-hidden', 'pl-1'];
const CONTENT_PADDING_BOTTOM_CLASS = 'pb-2';
const CONTENT_PADDING_TOP_CLASS = 'pt-0';
const CALLER_PADDING_BOTTOM_CLASS = 'pb-0';
const CALLER_PADDING_Y_CLASS = 'py-s';

const renderSingleItem = ({
  triggerProps = {},
  contentProps = {},
  defaultValue,
}: {
  triggerProps?: Partial<AccordionTriggerProps>;
  contentProps?: Partial<AccordionContentProps>;
  defaultValue?: string;
} = {}) =>
  testRender(
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultValue}>
      <AccordionItem value={FIRST_VALUE}>
        <AccordionTrigger {...triggerProps}>{FIRST_LABEL}</AccordionTrigger>
        <AccordionContent {...contentProps}>{FIRST_CONTENT}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );

const twoItems = (
  <>
    <AccordionItem value={FIRST_VALUE}>
      <AccordionTrigger>{FIRST_LABEL}</AccordionTrigger>
      <AccordionContent>{FIRST_CONTENT}</AccordionContent>
    </AccordionItem>
    <AccordionItem value={SECOND_VALUE}>
      <AccordionTrigger>{SECOND_LABEL}</AccordionTrigger>
      <AccordionContent>{SECOND_CONTENT}</AccordionContent>
    </AccordionItem>
  </>
);

const getTrigger = (name: string) => screen.getByRole('button', { name });
const getRegion = (name: string) => screen.getByRole('region', { name });

describe('Accordion', () => {
  it('should keep the item closed when nothing was pressed', () => {
    // Given / When
    renderSingleItem();

    // Then
    expect(getTrigger(FIRST_LABEL)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('should open a region named by its trigger when the trigger is clicked', async () => {
    // Given
    const { user } = renderSingleItem();
    const trigger = getTrigger(FIRST_LABEL);

    // When
    await user.click(trigger);

    // Then
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(getRegion(FIRST_LABEL)).toHaveTextContent(FIRST_CONTENT);
  });

  it('should close the open item when its trigger is clicked again and type is single collapsible', async () => {
    // Given
    const { user } = renderSingleItem();
    const trigger = getTrigger(FIRST_LABEL);
    await user.click(trigger);

    // When
    await user.click(trigger);

    // Then
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('should close the first item when another one opens and type is single', async () => {
    // Given
    const { user } = testRender(
      <Accordion
        type="single"
        collapsible>
        {twoItems}
      </Accordion>
    );
    await user.click(getTrigger(FIRST_LABEL));

    // When
    await user.click(getTrigger(SECOND_LABEL));

    // Then
    expect(getTrigger(FIRST_LABEL)).toHaveAttribute('aria-expanded', 'false');
    expect(getTrigger(SECOND_LABEL)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('region')).toHaveLength(1);
  });

  it('should keep both items open when type is multiple', async () => {
    // Given
    const { user } = testRender(
      <Accordion type="multiple">{twoItems}</Accordion>
    );
    await user.click(getTrigger(FIRST_LABEL));

    // When
    await user.click(getTrigger(SECOND_LABEL));

    // Then
    expect(getRegion(FIRST_LABEL)).toHaveTextContent(FIRST_CONTENT);
    expect(getRegion(SECOND_LABEL)).toHaveTextContent(SECOND_CONTENT);
  });

  it('should open the item at mount when a defaultValue is given', () => {
    // Given / When
    testRender(
      <Accordion
        type="multiple"
        defaultValue={[SECOND_VALUE]}>
        {twoItems}
      </Accordion>
    );

    // Then
    expect(getTrigger(FIRST_LABEL)).toHaveAttribute('aria-expanded', 'false');
    expect(getTrigger(SECOND_LABEL)).toHaveAttribute('aria-expanded', 'true');
    expect(getRegion(SECOND_LABEL)).toHaveTextContent(SECOND_CONTENT);
  });

  it('should follow the value prop and report changes when controlled', async () => {
    // Given
    const onValueChange = vi.fn();
    const { user } = testRender(
      <Accordion
        type="single"
        value={FIRST_VALUE}
        onValueChange={onValueChange}>
        {twoItems}
      </Accordion>
    );

    // When
    await user.click(getTrigger(SECOND_LABEL));

    // Then
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(SECOND_VALUE);
    expect(getTrigger(FIRST_LABEL)).toHaveAttribute('aria-expanded', 'true');
    expect(getTrigger(SECOND_LABEL)).toHaveAttribute('aria-expanded', 'false');
  });

  it('should place the trigger in a heading and expose its state when opened', async () => {
    // Given
    const { user } = renderSingleItem();
    const trigger = getTrigger(FIRST_LABEL);

    // When
    await user.click(trigger);

    // Then
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toContainElement(trigger);
    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('should render the chevron in an aria-hidden wrapper carrying the turn classes when the trigger renders', () => {
    // Given / When
    renderSingleItem();

    // Then
    const wrapper = getTrigger(FIRST_LABEL).querySelector('svg')?.parentElement;
    expect(wrapper?.tagName).toBe('SPAN');
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper).toHaveClass(...CHEVRON_WRAPPER_TURN_CLASSES);
  });

  it('should merge the item className on the item div when one is given', () => {
    // Given / When
    testRender(
      <Accordion type="multiple">
        <AccordionItem
          data-testid={ITEM_TEST_ID}
          value={FIRST_VALUE}
          className={CALLER_ITEM_CLASS}>
          <AccordionTrigger>{FIRST_LABEL}</AccordionTrigger>
          <AccordionContent>{FIRST_CONTENT}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // Then
    expect(screen.getByTestId(ITEM_TEST_ID)).toHaveClass(CALLER_ITEM_CLASS);
  });

  it('should keep a nested trigger closed when only its parent item is open', () => {
    // Given / When
    testRender(
      <Accordion
        type="single"
        collapsible
        defaultValue={FIRST_VALUE}>
        <AccordionItem value={FIRST_VALUE}>
          <AccordionTrigger>{FIRST_LABEL}</AccordionTrigger>
          <AccordionContent>
            <Accordion
              type="single"
              collapsible>
              <AccordionItem value={NESTED_VALUE}>
                <AccordionTrigger>{NESTED_LABEL}</AccordionTrigger>
                <AccordionContent>{NESTED_CONTENT}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // Then
    expect(getTrigger(FIRST_LABEL)).toHaveAttribute('data-state', 'open');
    expect(getTrigger(NESTED_LABEL)).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByText(NESTED_CONTENT)).not.toBeInTheDocument();
  });

  it('should apply the default trigger classes when no className is given', () => {
    // Given / When
    renderSingleItem();

    // Then
    expect(getTrigger(FIRST_LABEL)).toHaveClass(...TRIGGER_CLASSES);
  });

  it('should merge the trigger classes when a className is given', () => {
    // Given / When
    renderSingleItem({
      triggerProps: {
        className: `${CALLER_PADDING_RIGHT_CLASS} ${CALLER_HEIGHT_CLASS}`,
      },
    });

    // Then
    const trigger = getTrigger(FIRST_LABEL);
    expect(trigger).toHaveClass(
      CALLER_PADDING_RIGHT_CLASS,
      CALLER_HEIGHT_CLASS,
      TRIGGER_PADDING_Y_CLASS,
      TRIGGER_FOCUS_CLASS
    );
    expect(trigger).not.toHaveClass(TRIGGER_PADDING_RIGHT_CLASS);
  });

  it('should merge the content className on the inner div when one is given', () => {
    // Given / When
    renderSingleItem({
      defaultValue: FIRST_VALUE,
      contentProps: { className: CALLER_PADDING_BOTTOM_CLASS },
    });

    // Then
    const region = getRegion(FIRST_LABEL);
    const inner = screen.getByText(FIRST_CONTENT);
    expect(region).toHaveClass(...REGION_CLASSES);
    expect(region).toContainElement(inner);
    expect(inner).toHaveClass(
      CALLER_PADDING_BOTTOM_CLASS,
      CONTENT_PADDING_TOP_CLASS
    );
    expect(inner).not.toHaveClass(CONTENT_PADDING_BOTTOM_CLASS);
  });

  it('should keep the content top padding at zero when the caller gives a py-s', () => {
    // Given / When
    renderSingleItem({
      defaultValue: FIRST_VALUE,
      contentProps: { className: CALLER_PADDING_Y_CLASS },
    });

    // Then
    expect(screen.getByText(FIRST_CONTENT)).toHaveClass(
      CALLER_PADDING_Y_CLASS,
      CONTENT_PADDING_TOP_CLASS
    );
  });

  it('should reach the item div, the trigger button and the content div when refs are given', () => {
    // Given
    const itemRef = createRef<HTMLDivElement>();
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();

    // When
    testRender(
      <Accordion
        type="single"
        defaultValue={FIRST_VALUE}>
        <AccordionItem
          ref={itemRef}
          value={FIRST_VALUE}>
          <AccordionTrigger ref={triggerRef}>{FIRST_LABEL}</AccordionTrigger>
          <AccordionContent ref={contentRef}>{FIRST_CONTENT}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );

    // Then
    const trigger = getTrigger(FIRST_LABEL);
    const region = getRegion(FIRST_LABEL);
    expect(triggerRef.current).toBe(trigger);
    expect(contentRef.current).toBe(region);
    expect(contentRef.current?.tagName).toBe('DIV');
    expect(itemRef.current?.tagName).toBe('DIV');
    expect(itemRef.current).toContainElement(trigger);
    expect(itemRef.current).toContainElement(region);
  });
});
