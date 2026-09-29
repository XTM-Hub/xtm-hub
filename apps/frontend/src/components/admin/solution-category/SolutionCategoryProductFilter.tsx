import { useTranslate } from '@/hooks/use-translate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/ui';
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
      <SelectTrigger className="w-full sm:w-45">
        <SelectValue placeholder={t('SolutionCategory.ListPage.Product')} />
      </SelectTrigger>
      <SelectContent>
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
