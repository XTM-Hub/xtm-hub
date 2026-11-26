import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { type ComponentProps, createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Popover,
  PopoverContent,
  type PopoverContentProps,
  PopoverTrigger,
} from './Popover';

const TRIGGER_LABEL = 'Open notifications';
const PANEL_TEXT = 'Two pending users';
const PANEL_LABEL = 'Notifications';
const OUTSIDE_LABEL = 'Elsewhere';
const PANEL_CLASSES = [
  'layer-1',
  'p-4',
  'rounded-sm',
  'shadow-global-shadow',
  'z-[var(--fds-z-overlay,50)]',
];
const CALLER_WIDTH_CLASS = 'w-120';
const CALLER_PADDING_TOP_CLASS = 'pt-4';

const renderPopover = (
  contentProps: Partial<PopoverContentProps> = {},
  popoverProps: ComponentProps<typeof Popover> = {}
) =>
  testRender(
    <Popover {...popoverProps}>
      <PopoverTrigger>{TRIGGER_LABEL}</PopoverTrigger>
      <PopoverContent {...contentProps}>{PANEL_TEXT}</PopoverContent>
    </Popover>
  );

const openPopover = (contentProps: Partial<PopoverContentProps> = {}) =>
  renderPopover(contentProps, { defaultOpen: true });

describe('Popover', () => {
  it('should render no dialog when the trigger was not pressed', () => {
    // Given / When
    renderPopover();

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should open a dialog in the document body when the trigger is clicked', async () => {
    // Given
    const { user, container } = renderPopover();
    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });

    // When
    await user.click(trigger);

    // Then
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(PANEL_TEXT);
    expect(document.body).toContainElement(dialog);
    expect(container).not.toContainElement(dialog);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('should close and return focus to the trigger when Escape is pressed', async () => {
    // Given
    const { user } = renderPopover();
    const trigger = screen.getByRole('button', { name: TRIGGER_LABEL });
    await user.click(trigger);

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close when a pointer presses outside the open panel', async () => {
    // Given
    const { user } = testRender(
      <>
        <Popover>
          <PopoverTrigger>{TRIGGER_LABEL}</PopoverTrigger>
          <PopoverContent>{PANEL_TEXT}</PopoverContent>
        </Popover>
        <button type="button">{OUTSIDE_LABEL}</button>
      </>
    );
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

    // When
    await user.click(screen.getByRole('button', { name: OUTSIDE_LABEL }));

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should follow the open prop and report changes when controlled', async () => {
    // Given
    const onOpenChange = vi.fn();
    const { user } = renderPopover({}, { open: true, onOpenChange });

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should draw the panel as an elevation 1 Paper when no elevation or padding is given', () => {
    // Given
    openPopover();

    // When
    const dialog = screen.getByRole('dialog');

    // Then
    expect(dialog).toHaveClass(...PANEL_CLASSES);
  });

  it.each<[Partial<PopoverContentProps>, string, string]>([
    [{ elevation: 2 }, 'layer-2', 'layer-1'],
    [{ padding: 0 }, 'p-0', 'p-4'],
    [{ padding: 8 }, 'p-2', 'p-4'],
  ])(
    'should replace the default Paper class when given %o',
    (contentProps, expectedClass, replacedClass) => {
      // Given
      openPopover(contentProps);

      // When
      const dialog = screen.getByRole('dialog');

      // Then
      expect(dialog).toHaveClass(expectedClass);
      expect(dialog).not.toHaveClass(replacedClass);
    }
  );

  it('should merge the classes when a className is given', () => {
    // Given
    openPopover({
      padding: 0,
      className: `${CALLER_WIDTH_CLASS} ${CALLER_PADDING_TOP_CLASS}`,
    });

    // When
    const dialog = screen.getByRole('dialog');

    // Then
    expect(dialog).toHaveClass(
      CALLER_WIDTH_CLASS,
      CALLER_PADDING_TOP_CLASS,
      'p-0',
      'layer-1',
      'shadow-global-shadow'
    );
  });

  it('should align the panel to the start when align is not given', () => {
    // Given
    openPopover();

    // When
    const dialog = screen.getByRole('dialog');

    // Then
    expect(dialog).toHaveAttribute('data-align', 'start');
  });

  it('should align the panel to the end when align is end', () => {
    // Given
    openPopover({ align: 'end' });

    // When
    const dialog = screen.getByRole('dialog');

    // Then
    expect(dialog).toHaveAttribute('data-align', 'end');
  });

  it('should pass native and event props to the panel when given', async () => {
    // Given
    const onMouseEnter = vi.fn();
    const { user } = openPopover({ 'aria-label': PANEL_LABEL, onMouseEnter });

    // When
    await user.hover(screen.getByRole('dialog', { name: PANEL_LABEL }));

    // Then
    expect(onMouseEnter).toHaveBeenCalledOnce();
  });

  it('should reach the panel div when a ref is given', () => {
    // Given
    const ref = createRef<HTMLDivElement>();

    // When
    testRender(
      <Popover defaultOpen>
        <PopoverTrigger>{TRIGGER_LABEL}</PopoverTrigger>
        <PopoverContent ref={ref}>{PANEL_TEXT}</PopoverContent>
      </Popover>
    );

    // Then
    expect(ref.current).toBe(screen.getByRole('dialog'));
    expect(ref.current?.tagName).toBe('DIV');
  });
});
