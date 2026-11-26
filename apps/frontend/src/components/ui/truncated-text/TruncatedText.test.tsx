import testRender from '@/utils/test/test-render';
import { TooltipProvider } from '@filigran/design-system';
import { fireEvent, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { TruncatedText } from './TruncatedText';

const TEXT = 'Filigran organization';
const DETAIL = 'admin@filigran.io';
const CELL_WIDTH = 120;

const setTextWidth = (scrollWidth: number) => {
  const text = screen.getByText(TEXT);
  Object.defineProperty(text, 'clientWidth', { value: CELL_WIDTH });
  Object.defineProperty(text, 'scrollWidth', { value: scrollWidth });
  return text;
};

const renderTruncatedText = (props: ComponentProps<typeof TruncatedText>) =>
  testRender(
    <TooltipProvider>
      <TruncatedText {...props} />
    </TooltipProvider>
  );

describe('TruncatedText', () => {
  it('should show the full text in a tooltip when it is cut off', async () => {
    // Given a text wider than its cell
    renderTruncatedText({ text: TEXT });
    const text = setTextWidth(CELL_WIDTH + 1);

    // When the user focuses it
    fireEvent.focus(text);

    // Then a tooltip shows it in full
    expect(await screen.findByRole('tooltip')).toHaveTextContent(TEXT);
  });

  it('should show no tooltip when the text fits', () => {
    // Given a text that fits its cell
    renderTruncatedText({ text: TEXT });
    const text = setTextWidth(CELL_WIDTH);

    // When the user focuses it
    fireEvent.focus(text);

    // Then no tooltip opens
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show the text and its details in a tooltip, even when the text fits', async () => {
    // Given a text that fits its cell, with details
    renderTruncatedText({ text: TEXT, details: <span>{DETAIL}</span> });
    const text = setTextWidth(CELL_WIDTH);

    // When the user focuses it
    fireEvent.focus(text);

    // Then the tooltip shows the text and its details
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(TEXT);
    expect(tooltip).toHaveTextContent(DETAIL);
  });
});
