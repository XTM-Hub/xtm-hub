import { CustomDashboardFormValues } from '@/components/service/custom-dashboards/[serviceInstanceId]/CustomDashboardForm';
import { buildDocument } from '@/components/service/form/ServiceForm.test-utils';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { DocumentStatus } from '@graphql/generated';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDocumentContext } from './use-document-context';

const { mutations } = vi.hoisted(() => ({
  mutations: {
    documentCreateMutation: vi.fn(),
    documentUpdateMutation: vi.fn(),
  } as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock('react-relay', () => ({
  useMutation: (mutation: { params: { name: string } }) => [
    mutations[mutation.params.name] ?? vi.fn(),
    false,
  ],
}));

vi.mock('@/hooks/use-translate', () => ({
  useTranslate: () => (key: string) => key,
}));

vi.mock('@/utils/actions/revalidate-document-slugs.actions', () => ({
  default: vi.fn(),
}));

const SERVICE_INSTANCE = {
  id: 'service-instance-1',
  slug: null,
} as serviceInstance_fragment$data;

const buildValues = (overrides: Partial<CustomDashboardFormValues> = {}) =>
  ({
    name: 'Resource',
    slug: 'resource',
    short_description: 'Short description',
    description: 'Description',
    uploader_id: 'uploader-1',
    uploader_organization_id: 'organization-1',
    use_cases: [],
    document: [],
    logo: [],
    images: [],
    ...overrides,
  }) as unknown as CustomDashboardFormValues;

const renderContext = () =>
  renderHook(() =>
    useDocumentContext({
      serviceInstance: SERVICE_INSTANCE,
      type: ShareableResourceType.OPENCTI_CUSTOM_DASHBOARD,
    })
  ).result.current;

const sentInput = (mutation: ReturnType<typeof vi.fn>) =>
  mutation.mock.calls[0]?.[0].variables.input;

describe('useDocumentContext', () => {
  describe('handleAddSheet', () => {
    it.each([
      [true, DocumentStatus.Published],
      [false, DocumentStatus.Draft],
      [undefined, DocumentStatus.Draft],
    ])(
      'should send the matching status when the user creates a resource with the switch at %s',
      async (active, expectedStatus) => {
        // Given
        const { handleAddSheet } = renderContext();

        // When
        await handleAddSheet(buildValues({ active }), vi.fn(), vi.fn());

        // Then
        expect(sentInput(mutations.documentCreateMutation).status).toBe(
          expectedStatus
        );
      }
    );

    it('should not send the active form field when the user creates a resource', async () => {
      // Given
      const { handleAddSheet } = renderContext();

      // When
      await handleAddSheet(buildValues({ active: true }), vi.fn(), vi.fn());

      // Then
      expect(sentInput(mutations.documentCreateMutation)).not.toHaveProperty(
        'active'
      );
    });
  });

  describe('handleUpdateSheet', () => {
    it.each`
      active   | currentStatus      | expectedStatus
      ${false} | ${'published'}     | ${DocumentStatus.Draft}
      ${true}  | ${'draft'}         | ${DocumentStatus.Published}
      ${true}  | ${'in_validation'} | ${DocumentStatus.Published}
      ${true}  | ${'published'}     | ${undefined}
      ${false} | ${'draft'}         | ${undefined}
      ${false} | ${'in_validation'} | ${undefined}
    `(
      'should send the status $expectedStatus when the switch is $active and the resource is $currentStatus',
      async ({
        active,
        currentStatus,
        expectedStatus,
      }: {
        active: boolean;
        currentStatus: 'published' | 'draft' | 'in_validation';
        expectedStatus?: DocumentStatus;
      }) => {
        // Given
        const { handleUpdateSheet } = renderContext();

        // When
        await handleUpdateSheet(
          buildValues({ active }),
          buildDocument({ status: currentStatus }),
          vi.fn(),
          vi.fn()
        );

        // Then
        expect(sentInput(mutations.documentUpdateMutation).status).toBe(
          expectedStatus
        );
      }
    );

    it('should not send the active form field when the user updates a resource', async () => {
      // Given
      const { handleUpdateSheet } = renderContext();

      // When
      await handleUpdateSheet(
        buildValues({ active: false }),
        buildDocument({ status: 'published' }),
        vi.fn(),
        vi.fn()
      );

      // Then
      expect(sentInput(mutations.documentUpdateMutation)).not.toHaveProperty(
        'active'
      );
    });
  });
});
