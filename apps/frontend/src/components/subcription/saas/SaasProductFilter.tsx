import {
  getSaasProductName,
  SAAS_PRODUCTS,
} from '@/components/subcription/saas/saas-list.utils';
import { useTranslate } from '@/hooks/use-translate';
import { isValueInEnum } from '@/utils/is-value-in-enum';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@filigran/design-system';
import { SaasProduct } from '@graphql/generated';

const ALL_PRODUCTS = 'all';

export const SaasProductFilter = ({
  selectedProduct,
  onProductChange,
}: {
  selectedProduct: SaasProduct | null;
  onProductChange: (product: SaasProduct | null) => void;
}) => {
  const t = useTranslate();

  return (
    <Select
      value={selectedProduct ?? ALL_PRODUCTS}
      // Every other value, ALL_PRODUCTS among them, lists the platforms of every product
      onValueChange={(value) =>
        onProductChange(isValueInEnum(value, SaasProduct) ? value : null)
      }>
      <SelectTrigger
        aria-label={t('CSMBoard.Products')}
        className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="layer-1">
        <SelectItem value={ALL_PRODUCTS}>
          {t('CSMBoard.AllProducts')}
        </SelectItem>
        {SAAS_PRODUCTS.map((product) => (
          <SelectItem
            key={product}
            value={product}>
            {getSaasProductName(product)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
