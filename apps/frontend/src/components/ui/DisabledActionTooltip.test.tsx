import testRender from '@/utils/test/test-render';
import { Button } from '@filigran/design-system';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisabledActionTooltip } from './DisabledActionTooltip';

const ACTION_LABEL = 'Deploy';
const REASON = 'Deployment is unavailable';

const renderDisabledAction = () =>
  testRender(
    <DisabledActionTooltip reason={REASON}>
      <Button disabled={true}>{ACTION_LABEL}</Button>
    </DisabledActionTooltip>
  );

describe('DisabledActionTooltip', () => {
  it('should wrap the disabled action in a keyboard focusable element', () => {
    // Given
    renderDisabledAction();

    // When
    const button = screen.getByRole('button', { name: ACTION_LABEL });
    const wrapper = button.parentElement;

    // Then
    expect(button).toBeDisabled();
    expect(wrapper).toHaveAttribute('tabindex', '0');
  });

  it('should not show the reason before the action is reached', () => {
    // Given
    renderDisabledAction();

    // Then
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('should show the reason when the keyboard reaches the disabled action', async () => {
    // Given
    const { user } = renderDisabledAction();

    // When
    await user.tab();

    // Then
    expect(
      screen.getByRole('button', { name: ACTION_LABEL }).parentElement
    ).toHaveFocus();
    expect(
      await screen.findByRole('tooltip', { name: REASON })
    ).toBeInTheDocument();
  });
});
