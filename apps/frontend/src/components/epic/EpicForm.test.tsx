import EpicForm from '@/components/epic/EpicForm';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    handleCloseSheet: vi.fn(),
    setIsDirty: vi.fn(),
    setOpenSheet: vi.fn(),
  }),
}));

const FILE_INPUT_SELECTOR = 'input[type="file"]';

describe('EpicForm', () => {
  it('should not render a file input when the integration checkbox is ticked', async () => {
    // Given
    const { container, user } = testRender(<EpicForm handleSubmit={vi.fn()} />);
    expect(container.querySelector(FILE_INPUT_SELECTOR)).toBeNull();

    // When
    await user.click(
      screen.getByRole('checkbox', { name: 'Epic.Form.Integration' })
    );

    // Then
    expect(
      screen.getByRole('checkbox', { name: 'Epic.Form.Integration' })
    ).toBeChecked();
    expect(container.querySelector(FILE_INPUT_SELECTOR)).toBeNull();
  });
});
