import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { FiligranProduct } from '@graphql/generated';

const SolutionCategoryProductFilter = ({
  selectedProduct,
  onProductChange,
}: {
  selectedProduct?: FiligranProduct;
  onProductChange: (product?: FiligranProduct) => void;
}) => {
  const t = useTranslate();

  return (
    <Select
      value={selectedProduct ?? 'all'}
      onValueChange={(value) =>
        onProductChange(
          value === 'all' ? undefined : (value as FiligranProduct)
        )
      }>
      <SelectTrigger
        {...analyticsId('admin_solution_category_products_open')}
        aria-label={t('SolutionCategory.ListPage.Product')}
        className="w-full">
        <SelectValue placeholder={t('SolutionCategory.ListPage.Product')} />
      </SelectTrigger>
      <SelectContent className="layer-1">
        <SelectItem value="all">
          {t('SolutionCategory.ListPage.AllProducts')}
        </SelectItem>
        {Object.values(FiligranProduct).map((product) => (
          <SelectItem
            key={product}
            value={product}>
            {product.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SolutionCategoryProductFilter;
