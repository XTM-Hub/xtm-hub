import { FiligranProductMapping } from '@/components/epic/epic-item/FiligranProductMapping';
import {
  LogoFiligranIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
  OpenGrcIcon,
} from '@filigran/icon';
import { FiligranProduct } from '@graphql/generated';
import { describe, expect, it } from 'vitest';

describe('FiligranProductMapping', () => {
  it('contains all Filigran products from enum', () => {
    expect(Object.keys(FiligranProductMapping).sort()).toEqual(
      Object.values(FiligranProduct).sort()
    );
  });

  it.each`
    product                    | expectedName | expectedLogoComponent
    ${FiligranProduct.Opencti} | ${'OpenCTI'} | ${OpenCtiIconIcon}
    ${FiligranProduct.Openaev} | ${'OpenAEV'} | ${OpenAevIconIcon}
    ${FiligranProduct.Xtmhub}  | ${'XTM Hub'} | ${LogoFiligranIcon}
    ${FiligranProduct.Xtmone}  | ${'XTM One'} | ${LogoXtmOneIcon}
    ${FiligranProduct.Opencrq} | ${'OpenCRQ'} | ${OpenGrcIcon}
  `(
    'maps $product with expected name and logo',
    ({
      product,
      expectedName,
      expectedLogoComponent,
    }: {
      product: FiligranProduct;
      expectedName: string;
      expectedLogoComponent: React.ElementType;
    }) => {
      const metadata = FiligranProductMapping[product];

      expect(metadata.name).toBe(expectedName);

      const logo = metadata.logo as React.ReactElement;

      expect(logo.type).toBe(expectedLogoComponent);
    }
  );
});
