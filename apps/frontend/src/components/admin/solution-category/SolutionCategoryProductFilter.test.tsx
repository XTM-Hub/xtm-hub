import SolutionCategoryProductFilter from '@/components/admin/solution-category/SolutionCategoryProductFilter';
import testRender from '@/utils/test/test-render';
import { FiligranProduct } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { ReactNode } from 'react';

vi.mock('@filigran/design-system', async () => {
  const actual = await vi.importActual<
    typeof import('@filigran/design-system')
  >('@filigran/design-system');

  return {
    ...actual,
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (nextValue: string) => void;
      children: ReactNode;
    }) => (
      <select
        aria-label="product-filter"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}>
        {children}
      </select>
    ),
    SelectContent: ({ children }: { children: ReactNode }) => children,
    SelectItem: ({
      value,
      children,
    }: {
      value: string;
      children: ReactNode;
    }) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: { children: ReactNode }) => children,
    SelectValue: () => null,
  };
});

describe('SolutionCategoryProductFilter', () => {
  it('should call onProductChange with undefined when selecting all', async () => {
    const onProductChange = vi.fn();
    const { user } = testRender(
      <SolutionCategoryProductFilter
        selectedProduct={FiligranProduct.Opencti}
        onProductChange={onProductChange}
      />
    );

    await user.selectOptions(screen.getByLabelText('product-filter'), 'all');

    expect(onProductChange).toHaveBeenCalledWith(undefined);
  });

  it('should call onProductChange with selected product', async () => {
    const onProductChange = vi.fn();
    const { user } = testRender(
      <SolutionCategoryProductFilter onProductChange={onProductChange} />
    );

    await user.selectOptions(
      screen.getByLabelText('product-filter'),
      FiligranProduct.Opencti
    );

    expect(onProductChange).toHaveBeenCalledWith(FiligranProduct.Opencti);
  });
});
