import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { FiligranProduct } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useServiceFormFields } from './UseServiceFormFields';

vi.mock('../../ui/SheetWithPreventingDialog', () => ({
  useDialogContext: () => ({
    setIsDirty: vi.fn(),
  }),
}));

const existingDocument = {
  id: 'doc-1',
  slug: 'existing-slug',
  name: 'Existing Document',
  children_documents: [],
} as unknown as documentItem_fragment$data;

describe('useServiceFormFields', () => {
  describe('slug field', () => {
    it.each`
      scenario      | document            | expectedReadOnly | expectedDisabled
      ${'creation'} | ${undefined}        | ${false}         | ${false}
      ${'edition'}  | ${existingDocument} | ${true}          | ${true}
    `(
      'should have readOnly=$expectedReadOnly in $scenario mode',
      ({ document, expectedReadOnly, expectedDisabled }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType: 'Custom Dashboard',
            platform: 'OpenCTI',
            document,
          })
        );

        expect(result.current.slug.inputProps.readOnly).toBe(expectedReadOnly);
        expect(result.current.slug.inputProps.disabled).toBe(expectedDisabled);
      }
    );

    it.each`
      documentType                 | platform
      ${'CSV Feed'}                | ${'OpenCTI'}
      ${'TAXII Feed'}              | ${'OpenCTI'}
      ${'RSS Feed'}                | ${'OpenCTI'}
      ${'Stream'}                  | ${'OpenCTI'}
      ${'Third Party Integration'} | ${'OpenCTI'}
      ${'Connector'}               | ${'OpenCTI'}
      ${'Custom Dashboard'}        | ${'OpenCTI'}
      ${'Scenario'}                | ${'OpenAEV'}
    `(
      'should be readOnly in edition for $documentType on $platform',
      ({ documentType, platform }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType,
            platform,
            document: existingDocument,
          })
        );

        expect(result.current.slug.inputProps.readOnly).toBe(true);
      }
    );

    it.each`
      scenario                   | disabledFields | expectedDisabled
      ${'not in disabledFields'} | ${[]}          | ${false}
      ${'in disabledFields'}     | ${['slug']}    | ${true}
    `(
      'should be disabled=$expectedDisabled when $scenario',
      ({ disabledFields, expectedDisabled }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType: 'Custom Dashboard',
            platform: 'OpenCTI',
            disabledFields,
          })
        );

        expect(result.current.slug.inputProps.disabled).toBe(expectedDisabled);
      }
    );
  });

  describe('use_cases field', () => {
    it.each`
      documentType                 | platform     | expectedRequired
      ${'Connector'}               | ${'OpenCTI'} | ${false}
      ${'CSV Feed'}                | ${'OpenCTI'} | ${true}
      ${'TAXII Feed'}              | ${'OpenCTI'} | ${true}
      ${'RSS Feed'}                | ${'OpenCTI'} | ${true}
      ${'Stream'}                  | ${'OpenCTI'} | ${true}
      ${'Third Party Integration'} | ${'OpenCTI'} | ${true}
      ${'Custom Dashboard'}        | ${'OpenCTI'} | ${true}
      ${'Custom View'}             | ${'OpenCTI'} | ${true}
      ${'Playbook'}                | ${'OpenCTI'} | ${true}
      ${'Scenario'}                | ${'OpenAEV'} | ${true}
    `(
      'should have required=$expectedRequired for $documentType',
      ({ documentType, platform, expectedRequired }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType,
            platform,
            document: existingDocument,
          })
        );

        const element = result.current.use_cases.fieldType({
          field: {} as never,
        });

        expect(element.props.required).toBe(expectedRequired);
      }
    );
  });

  describe('solution_categories field', () => {
    it.each`
      scenario                   | disabledFields             | expectedDisabled
      ${'not in disabledFields'} | ${[]}                      | ${false}
      ${'in disabledFields'}     | ${['solution_categories']} | ${true}
    `(
      'should be disabled=$expectedDisabled when $scenario',
      ({ disabledFields, expectedDisabled }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType: 'CSV Feed',
            platform: 'OpenCTI',
            document: existingDocument,
            disabledFields,
          })
        );

        const element = result.current.solution_categories.fieldType({
          field: {} as never,
        });

        expect(element.props.disabled).toBe(expectedDisabled);
      }
    );

    it.each`
      platform     | expectedProduct
      ${'OpenCTI'} | ${FiligranProduct.Opencti}
      ${'OpenAEV'} | ${FiligranProduct.Openaev}
    `(
      'should map $platform platform to the correct product',
      ({ platform, expectedProduct }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType: 'Scenario',
            platform,
            document: existingDocument,
          })
        );

        const element = result.current.solution_categories.fieldType({
          field: {} as never,
        });

        expect(element.props.product).toBe(expectedProduct);
      }
    );
  });

  describe('license_type field', () => {
    it('should expose license type label key', () => {
      const { result } = renderHook(() =>
        useServiceFormFields({
          documentType: 'CSV Feed',
          platform: 'OpenCTI',
          document: existingDocument,
        })
      );

      expect(result.current.license_type.label).toBe(
        'Service.Form.LicenseTypeLabel'
      );
    });

    it.each`
      scenario                   | disabledFields      | expectedDisabled
      ${'not in disabledFields'} | ${[]}               | ${false}
      ${'in disabledFields'}     | ${['license_type']} | ${true}
    `(
      'should be disabled=$expectedDisabled when $scenario',
      ({ disabledFields, expectedDisabled }) => {
        const { result } = renderHook(() =>
          useServiceFormFields({
            documentType: 'CSV Feed',
            platform: 'OpenCTI',
            document: existingDocument,
            disabledFields,
          })
        );

        expect(result.current.license_type.inputProps.disabled).toBe(
          expectedDisabled
        );
      }
    );
  });
});
