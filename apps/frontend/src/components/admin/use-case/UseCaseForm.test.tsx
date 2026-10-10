import UseCaseForm from '@/components/admin/use-case/UseCaseForm';
import testRender from '@/utils/test/test-render';
import { FiligranProduct, UseCaseRowFragment } from '@graphql/generated';
import { screen } from '@testing-library/react';

describe('UseCaseForm', () => {
  describe('form validation', () => {
    const mockHandleSubmit = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    const renderAndSubmit = async ({
      name,
      color,
    }: {
      name: string;
      color: string;
    }) => {
      const { user } = testRender(
        <UseCaseForm
          handleSubmit={mockHandleSubmit}
          onClose={mockOnClose}
        />
      );

      const colorInput = screen.getByRole('textbox', {
        name: 'UseCaseForm.Color',
      });

      await user.type(screen.getByLabelText(/Name/i), name);
      await user.clear(colorInput);
      if (color) {
        await user.type(colorInput, color);
      }
      await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));
    };

    it.each`
      color
      ${'#12'}
      ${'#12345g'}
      ${'blue'}
      ${''}
    `(
      'should reject invalid color "$color"',
      async ({ color }: { color: string }) => {
        await renderAndSubmit({
          name: 'Threat hunting',
          color,
        });

        expect(mockHandleSubmit).not.toHaveBeenCalled();
      }
    );

    it.each`
      color        | expected
      ${'123456'}  | ${'#123456'}
      ${'#abc'}    | ${'#aabbcc'}
      ${'#ABCDEF'} | ${'#abcdef'}
      ${'#abcd'}   | ${'#aabbcc'}
    `(
      'should submit "$expected" when the color typed is "$color"',
      async ({ color, expected }: { color: string; expected: string }) => {
        // Given
        const name = 'Threat hunting';

        // When
        await renderAndSubmit({ name, color });

        // Then
        expect(mockHandleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ color: expected }),
          expect.anything()
        );
      }
    );

    it('should reject name shorter than 2 characters', async () => {
      await renderAndSubmit({
        name: 'A',
        color: '#123456',
      });

      expect(mockHandleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    const mockHandleSubmit = vi.fn();
    const mockHandleDelete = vi.fn();
    const mockOnClose = vi.fn();

    const useCase: UseCaseRowFragment = {
      id: 'use-case-id',
      name: 'Threat hunting',
      color: '#123456',
      product: [FiligranProduct.Opencti],
      ' $fragmentType': 'useCase_fragment',
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should call onClose when clicking cancel', async () => {
      const { user } = testRender(
        <UseCaseForm
          handleSubmit={mockHandleSubmit}
          onClose={mockOnClose}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call handleDelete on delete confirmation', async () => {
      const { user } = testRender(
        <UseCaseForm
          useCase={useCase}
          handleSubmit={mockHandleSubmit}
          handleDelete={mockHandleDelete}
          onClose={mockOnClose}
        />
      );

      await user.click(
        screen.getByRole('button', { name: 'MenuActions.Delete' })
      );
      await user.click(
        screen.getByRole('button', { name: 'MenuActions.Delete' })
      );

      expect(mockHandleDelete).toHaveBeenCalledTimes(1);
    });
  });
});
