import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { createRef, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  Sheet,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';

const TRIGGER_LABEL = 'Add user';
const TITLE = 'Add a user';
const DESCRIPTION = 'Invite someone to the organization';
const FIELD_LABEL = 'Email';
const SUGGESTIONS_ID = 'email-suggestions';
const FOOTER_ACTION = 'Validate';
const DEFAULT_CLOSE_LABEL = 'Close';
const CLOSE_LABEL = 'Close menu';
const HEADER_TEST_ID = 'sheet-header';
const FOOTER_TEST_ID = 'sheet-footer';
const PANEL_ELEVATION_CLASS = 'layer-2';
const HEADER_BACKGROUND_CLASS = 'bg-elevation-heading';
const FOOTER_JUSTIFY_CLASS = 'justify-end';
const PANEL_CLASSES = [
  PANEL_ELEVATION_CLASS,
  'rounded-none',
  'shadow-global-shadow',
  'pt-16',
  'z-[var(--fds-z-overlay,50)]',
  'flex-col',
  'w-full',
  'md:w-1/2',
];
const BODY_CLASSES = ['h-full', 'overflow-y-auto'];
const OVERLAY_CLASSES = [
  'fixed',
  'inset-0',
  'z-[var(--fds-z-overlay,50)]',
  'layer-0',
  'bg-elevation-default',
  'backdrop-blur-sm',
  'opacity-80',
];
const HEADER_CLASSES = [
  'absolute',
  'inset-x-0',
  'top-0',
  'z-1',
  'flex',
  'h-16',
  'flex-col',
  'justify-center',
  'pl-6',
  'pr-14',
  HEADER_BACKGROUND_CLASS,
];
const FOOTER_CLASSES = [
  'flex',
  'items-center',
  FOOTER_JUSTIFY_CLASS,
  'gap-2',
  'pb-6',
];
const PANEL_BACKGROUND_CLASS = 'bg-elevation-default';
const CALLER_BACKGROUND_CLASS = 'bg-gradient-background';
const HEADER_DIRECTION_CLASS = 'flex-col';
const CALLER_PADDING_LEFT_CLASS = 'pl-l';
const CALLER_DIRECTION_CLASS = 'flex-row';
const FOOTER_PADDING_BOTTOM_CLASS = 'pb-6';
const CALLER_PADDING_BOTTOM_CLASS = 'pb-0';
const CALLER_JUSTIFY_CLASS = 'sm:justify-between';

const sheetBody = (
  <>
    <SheetHeader data-testid={HEADER_TEST_ID}>
      <SheetTitle>{TITLE}</SheetTitle>
      <SheetDescription>{DESCRIPTION}</SheetDescription>
    </SheetHeader>
    <label>
      {FIELD_LABEL}
      <input type="email" />
    </label>
    <SheetFooter data-testid={FOOTER_TEST_ID}>
      <button type="submit">{FOOTER_ACTION}</button>
    </SheetFooter>
  </>
);

const renderSheet = (
  contentProps: Partial<SheetContentProps> = {},
  children: ReactNode = sheetBody
) =>
  testRender(
    <Sheet>
      <SheetTrigger>{TRIGGER_LABEL}</SheetTrigger>
      <SheetContent {...contentProps}>{children}</SheetContent>
    </Sheet>
  );

const openSheet = async (contentProps: Partial<SheetContentProps> = {}) => {
  const rendered = renderSheet(contentProps);
  await rendered.user.click(
    screen.getByRole('button', { name: TRIGGER_LABEL })
  );
  return rendered;
};

const renderOpenSheet = (children: ReactNode) =>
  testRender(
    <Sheet defaultOpen>
      <SheetContent>
        <SheetTitle>{TITLE}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );

describe('Sheet', () => {
  it('should render no dialog when the trigger was not pressed', () => {
    // Given / When
    renderSheet();

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should open a dialog in the document body named by its title and described by its description when the trigger is clicked', async () => {
    // Given
    const { user, container } = renderSheet();

    // When
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));

    // Then
    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
    expect(dialog.parentElement).toBe(document.body);
    expect(container).not.toContainElement(dialog);
  });

  it('should draw the panel as a square elevation 2 Paper around a scrolling body when it opens', async () => {
    // Given / When
    await openSheet();

    // Then
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass(...PANEL_CLASSES);
    expect(dialog.firstElementChild).toHaveClass(...BODY_CLASSES);
  });

  it.each<[SheetContentProps['side'], string, string]>([
    [undefined, 'right-0', 'left-0'],
    ['left', 'left-0', 'right-0'],
  ])(
    'should draw the panel against its edge when side is %s',
    async (side, expectedClass, otherClass) => {
      // Given / When
      await openSheet({ side });

      // Then
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass(expectedClass);
      expect(dialog).not.toHaveClass(otherClass);
    }
  );

  it('should replace the panel background when the caller gives one', async () => {
    // Given / When
    await openSheet({ className: CALLER_BACKGROUND_CLASS });

    // Then
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass(CALLER_BACKGROUND_CLASS, PANEL_ELEVATION_CLASS);
    expect(dialog).not.toHaveClass(PANEL_BACKGROUND_CLASS);
  });

  it('should render the Dialog scrim behind the panel when it opens', async () => {
    // Given / When
    await openSheet();

    // Then
    const overlay = screen.getByRole('dialog').previousElementSibling;
    expect(overlay?.parentElement).toBe(document.body);
    expect(overlay).toHaveClass(...OVERLAY_CLASSES);
  });

  it.each<[string | undefined, string]>([
    [undefined, DEFAULT_CLOSE_LABEL],
    [CLOSE_LABEL, CLOSE_LABEL],
  ])(
    'should close when the close button is clicked and closeLabel is %s',
    async (closeLabel, expectedName) => {
      // Given
      const { user } = await openSheet({ closeLabel });

      // When
      await user.click(screen.getByRole('button', { name: expectedName }));

      // Then
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('should focus the first field rather than the close button when it opens', async () => {
    // Given / When
    await openSheet();

    // Then
    expect(screen.getByRole('textbox', { name: FIELD_LABEL })).toHaveFocus();
  });

  it('should close and return focus to the trigger when Escape is pressed', async () => {
    // Given
    const { user } = await openSheet();

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: TRIGGER_LABEL })).toHaveFocus();
  });

  it('should stay open and skip the caller handler when Escape comes from an expanded combobox', async () => {
    // Given
    const onEscapeKeyDown = vi.fn();
    const { user } = testRender(
      <Sheet defaultOpen>
        <SheetContent onEscapeKeyDown={onEscapeKeyDown}>
          <SheetTitle>{TITLE}</SheetTitle>
          <input
            role="combobox"
            aria-label={FIELD_LABEL}
            aria-controls={SUGGESTIONS_ID}
            aria-expanded="true"
          />
        </SheetContent>
      </Sheet>
    );
    await user.click(screen.getByRole('combobox', { name: FIELD_LABEL }));

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
    expect(onEscapeKeyDown).not.toHaveBeenCalled();
  });

  it('should close and call the caller handler when Escape comes from a collapsed combobox', async () => {
    // Given
    const onEscapeKeyDown = vi.fn();
    const { user } = testRender(
      <Sheet defaultOpen>
        <SheetContent onEscapeKeyDown={onEscapeKeyDown}>
          <SheetTitle>{TITLE}</SheetTitle>
          <input
            role="combobox"
            aria-label={FIELD_LABEL}
            aria-controls={SUGGESTIONS_ID}
            aria-expanded="false"
          />
        </SheetContent>
      </Sheet>
    );
    await user.click(screen.getByRole('combobox', { name: FIELD_LABEL }));

    // When
    await user.keyboard('{Escape}');

    // Then
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onEscapeKeyDown).toHaveBeenCalledOnce();
  });

  it('should stay open on an outside press when the caller prevents it', async () => {
    // Given
    const onPointerDownOutside = vi.fn((event: Event) =>
      event.preventDefault()
    );
    renderSheet({ onPointerDownOutside });
    // The open modal sets pointer-events: none on the body, which user-event would refuse to click through.
    const user = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    await user.click(screen.getByRole('button', { name: TRIGGER_LABEL }));
    const overlay = screen.getByRole('dialog').previousElementSibling;

    // When
    await user.click(overlay as Element);

    // Then
    expect(onPointerDownOutside).toHaveBeenCalledOnce();
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
  });

  it('should apply the heading bar and footer classes when no className is given', async () => {
    // Given / When
    await openSheet();

    // Then
    expect(screen.getByTestId(HEADER_TEST_ID)).toHaveClass(...HEADER_CLASSES);
    expect(screen.getByTestId(FOOTER_TEST_ID)).toHaveClass(...FOOTER_CLASSES);
  });

  it('should add the caller classes to the heading bar and drop its column direction when a className is given', () => {
    // Given / When
    renderOpenSheet(
      <SheetHeader
        data-testid={HEADER_TEST_ID}
        className={`${CALLER_PADDING_LEFT_CLASS} ${CALLER_DIRECTION_CLASS}`}
      />
    );

    // Then
    const header = screen.getByTestId(HEADER_TEST_ID);
    expect(header).toHaveClass(
      CALLER_PADDING_LEFT_CLASS,
      CALLER_DIRECTION_CLASS,
      HEADER_BACKGROUND_CLASS
    );
    expect(header).not.toHaveClass(HEADER_DIRECTION_CLASS);
  });

  it('should replace the footer bottom padding when the caller gives one', () => {
    // Given / When
    renderOpenSheet(
      <SheetFooter
        data-testid={FOOTER_TEST_ID}
        className={`${CALLER_PADDING_BOTTOM_CLASS} ${CALLER_JUSTIFY_CLASS}`}
      />
    );

    // Then
    const footer = screen.getByTestId(FOOTER_TEST_ID);
    expect(footer).toHaveClass(
      CALLER_PADDING_BOTTOM_CLASS,
      CALLER_JUSTIFY_CLASS,
      FOOTER_JUSTIFY_CLASS
    );
    expect(footer).not.toHaveClass(FOOTER_PADDING_BOTTOM_CLASS);
  });

  it('should reach the panel, the title and the description when refs are given', () => {
    // Given
    const panelRef = createRef<HTMLDivElement>();
    const titleRef = createRef<HTMLHeadingElement>();
    const descriptionRef = createRef<HTMLParagraphElement>();

    // When
    testRender(
      <Sheet defaultOpen>
        <SheetContent ref={panelRef}>
          <SheetTitle ref={titleRef}>{TITLE}</SheetTitle>
          <SheetDescription ref={descriptionRef}>
            {DESCRIPTION}
          </SheetDescription>
        </SheetContent>
      </Sheet>
    );

    // Then
    expect(panelRef.current).toBe(screen.getByRole('dialog'));
    expect(panelRef.current?.tagName).toBe('DIV');
    expect(titleRef.current).toBe(screen.getByText(TITLE));
    expect(descriptionRef.current).toBe(screen.getByText(DESCRIPTION));
  });
});
