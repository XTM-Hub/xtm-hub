import {
  LogoFiligranIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
} from '@filigran/icon';
import { FiligranProduct } from '@graphql/generated';
import { ReactNode } from 'react';

export interface FiligranProductMetadata {
  name: string;
  logo: ReactNode;
}

export const FiligranProductMapping: Record<
  FiligranProduct,
  FiligranProductMetadata
> = {
  [FiligranProduct.Xtmhub]: {
    name: 'XTM Hub',
    logo: <LogoFiligranIcon className="w-5 h-5" />,
  },
  [FiligranProduct.Opencti]: {
    name: 'OpenCTI',
    logo: <OpenCtiIconIcon className="w-5 h-5" />,
  },
  [FiligranProduct.Openaev]: {
    name: 'OpenAEV',
    logo: <OpenAevIconIcon className="w-5 h-5" />,
  },
  [FiligranProduct.Xtmone]: {
    name: 'XTM One',
    logo: <LogoXtmOneIcon className="w-5 h-5" />,
  },
};
