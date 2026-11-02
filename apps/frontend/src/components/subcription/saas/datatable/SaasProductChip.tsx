import { getSaasProductName } from '@/components/subcription/saas/saas-list.utils';
import { useTranslate } from '@/hooks/use-translate';
import {
  Chip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@filigran/design-system';
import { type SaasProduct } from '@graphql/generated';

export const SaasProductChip = ({
  product,
  version,
}: {
  product: SaasProduct;
  version: string | null | undefined;
}) => {
  const t = useTranslate();
  const productName = getSaasProductName(product);

  if (!version) {
    return (
      <Chip
        label={productName}
        severity="info"
      />
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Chip
          label={productName}
          severity="info"
          tabIndex={0}
        />
      </TooltipTrigger>
      <TooltipContent>
        {t('CSMBoard.ProductVersion', { version })}
      </TooltipContent>
    </Tooltip>
  );
};
