import { EpicList } from '@/components/epic/EpicList';
import { EpicListContext } from '@/hooks/use-epic-list-context';
import { APP_PATH } from '@/utils/path/constant';
import { mockGraphqlQuery } from '@/utils/test/msw/graphql-api';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import {
  CurrentVotingRoundCalloutQuery,
  EditionType,
  EpicType,
  FiligranProduct,
  OrganizationCapability,
  ServiceRestriction,
  Timeline,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseServiceCapability, mockUseServiceCapabilityWithSubscriptionId } =
  vi.hoisted(() => ({
    mockUseServiceCapability: vi.fn(),
    mockUseServiceCapabilityWithSubscriptionId: vi.fn(),
  }));
const { mockUseAdminByPass } = vi.hoisted(() => ({
  mockUseAdminByPass: vi.fn(),
}));

vi.mock('@/hooks/use-service-capability', () => ({
  default: mockUseServiceCapability,
  useServiceCapabilityWithSubscriptionId:
    mockUseServiceCapabilityWithSubscriptionId,
}));
vi.mock('@/hooks/use-portal-capability', () => ({
  useAdminByPass: mockUseAdminByPass,
}));
vi.mock('usehooks-ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('usehooks-ts')>();
  return {
    ...actual,
    useDebounceCallback: (
      callback: (event: { target: { value: string } }) => void
    ) => callback,
  };
});

const GQL_OPERATION_CALLOUT = 'CurrentVotingRoundCallout';
const CONNECTION_ID = 'connection-id-1';
const SERVICE_INSTANCE_ID = 'service-instance-1';
const SUBSCRIPTION_ID = 'subscription-id-1';
const NOW_EPIC_TITLE = 'Now epic';
const NEXT_EPIC_TITLE = 'Next epic';
const DRAFT_EPIC_TITLE = 'Draft epic';
const FINISHED_EPIC_TITLE = 'Finished epic';

const mockCurrentRound = (
  currentVotingRound: CurrentVotingRoundCalloutQuery['currentVotingRound']
) =>
  mswServer.use(
    mockGraphqlQuery<CurrentVotingRoundCalloutQuery>({
      queryName: GQL_OPERATION_CALLOUT,
      data: { currentVotingRound },
    })
  );

const makeEpic = (
  overrides: Partial<epic_fragment$data> = {}
): epic_fragment$data => ({
  id: 'epic-id',
  short_description: 'short description',
  description: 'description',
  title: NOW_EPIC_TITLE,
  timeline: Timeline.Now,
  edition_type: EditionType.CommunityEdition,
  product: [FiligranProduct.Opencti],
  active: true,
  epic_type: EpicType.Other,
  document_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const serviceInstance = {
  id: SERVICE_INSTANCE_ID,
  capabilities: [],
} as serviceInstance_fragment$data;
const seoServiceInstance = {
  id: SERVICE_INSTANCE_ID,
} as seoServiceInstanceFragment$data;

const renderEpicList = (
  propsOverrides: Partial<ComponentProps<typeof EpicList>> = {},
  organizationCapabilities: OrganizationCapability[] = []
) => {
  const defaultProps: ComponentProps<typeof EpicList> = {
    epics: [makeEpic()],
    serviceInstance,
    selectedProduct: [],
    onFilterChange: vi.fn(),
    onSearch: vi.fn(),
  };

  return {
    ...testRender(
      <EpicListContext.Provider value={{ connectionID: CONNECTION_ID }}>
        <EpicList
          {...defaultProps}
          {...propsOverrides}
        />
      </EpicListContext.Provider>,
      { me: { selected_org_capabilities: organizationCapabilities } }
    ),
    props: { ...defaultProps, ...propsOverrides },
  };
};

describe('EpicList', () => {
  beforeEach(() => {
    mockUseServiceCapability.mockReturnValue(false);
    mockUseServiceCapabilityWithSubscriptionId.mockReturnValue({
      hasCapability: false,
      subscriptionId: SUBSCRIPTION_ID,
    });
    mockUseAdminByPass.mockReturnValue(false);
    mockCurrentRound(null);
  });

  it('should hide draft timeline when user cannot update or delete epics', () => {
    // Given
    const epics = [
      makeEpic({
        id: 'draft-epic',
        title: DRAFT_EPIC_TITLE,
        active: false,
        timeline: Timeline.Now,
      }),
      makeEpic({
        id: 'now-epic',
        title: NOW_EPIC_TITLE,
        active: true,
        timeline: Timeline.Now,
      }),
    ];

    // When
    renderEpicList({ epics });

    // Then
    expect(screen.queryByText('Epic.Timeline.draft')).not.toBeInTheDocument();
  });

  it('should only render epics from selected product when a product filter is active', () => {
    // Given
    const epics = [
      makeEpic({
        id: 'opencti-epic',
        title: NOW_EPIC_TITLE,
        product: [FiligranProduct.Opencti],
      }),
      makeEpic({
        id: 'openaev-epic',
        title: NEXT_EPIC_TITLE,
        product: [FiligranProduct.Openaev],
      }),
    ];

    // When
    renderEpicList({
      epics,
      selectedProduct: [FiligranProduct.Opencti],
    });

    // Then
    expect(screen.queryByText(NEXT_EPIC_TITLE)).not.toBeInTheDocument();
  });

  it('should render epics from every selected product', () => {
    // Given
    const epics = [
      makeEpic({
        id: 'opencti-epic',
        title: NOW_EPIC_TITLE,
        product: [FiligranProduct.Opencti],
      }),
      makeEpic({
        id: 'openaev-epic',
        title: NEXT_EPIC_TITLE,
        product: [FiligranProduct.Openaev],
      }),
    ];

    // When
    renderEpicList({
      epics,
      selectedProduct: [FiligranProduct.Opencti, FiligranProduct.Openaev],
    });

    // Then
    expect(screen.getByText(NOW_EPIC_TITLE)).toBeInTheDocument();
    expect(screen.getByText(NEXT_EPIC_TITLE)).toBeInTheDocument();
  });

  it('should render an epic targeting several products under each of its products', () => {
    // Given
    const epics = [
      makeEpic({
        id: 'multi-product-epic',
        title: NOW_EPIC_TITLE,
        product: [FiligranProduct.Opencti, FiligranProduct.Openaev],
      }),
    ];

    // When
    renderEpicList({
      epics,
      selectedProduct: [FiligranProduct.Openaev],
    });

    // Then
    expect(screen.getByText(NOW_EPIC_TITLE)).toBeInTheDocument();
  });

  it('should show finished timeline when user enables finished epics display', async () => {
    // Given
    const epics = [
      makeEpic({
        id: 'finished-epic',
        title: FINISHED_EPIC_TITLE,
        timeline: Timeline.Finished,
        updated_at: '2026-08-01T00:00:00.000Z',
      }),
    ];
    const { user } = renderEpicList({ epics });

    // When
    await user.click(screen.getByRole('switch'));

    // Then
    expect(screen.getByText('Epic.Timeline.finished')).toBeInTheDocument();
  });

  it('should call search callback when typing in search input', async () => {
    // Given
    const onSearch = vi.fn();
    const { user } = renderEpicList({ onSearch });

    // When
    await user.type(
      screen.getByPlaceholderText('GenericActions.Search'),
      'road'
    );

    // Then
    expect(onSearch).toHaveBeenLastCalledWith('road');
  });

  it('should pass detailed service instance to capability hooks when capabilities exist', () => {
    // Given
    const detailedServiceInstance = {
      id: SERVICE_INSTANCE_ID,
      capabilities: [ServiceRestriction.ManageAccess],
    } as serviceInstance_fragment$data;

    // When
    renderEpicList({ serviceInstance: detailedServiceInstance });

    // Then
    expect(mockUseServiceCapability).toHaveBeenCalledWith(
      ServiceRestriction.Upsert,
      detailedServiceInstance
    );
    expect(mockUseServiceCapability).toHaveBeenCalledWith(
      ServiceRestriction.Delete,
      detailedServiceInstance
    );
    expect(mockUseServiceCapabilityWithSubscriptionId).toHaveBeenCalledWith(
      ServiceRestriction.ManageAccess,
      detailedServiceInstance
    );
  });

  it('should pass undefined to capability hooks when service instance has no capabilities', () => {
    // Given
    renderEpicList({ serviceInstance: seoServiceInstance });

    // Then
    expect(mockUseServiceCapability).toHaveBeenCalledWith(
      ServiceRestriction.Upsert,
      undefined
    );
    expect(mockUseServiceCapability).toHaveBeenCalledWith(
      ServiceRestriction.Delete,
      undefined
    );
    expect(mockUseServiceCapabilityWithSubscriptionId).toHaveBeenCalledWith(
      ServiceRestriction.ManageAccess,
      undefined
    );
  });

  it.each`
    hasUpsertServiceCapability | hasDeleteServiceCapability | hasManageAccessServiceCapability | shouldRender | description
    ${true}                    | ${false}                   | ${false}                         | ${true}      | ${'upsert capability allows create'}
    ${false}                   | ${false}                   | ${false}                         | ${false}     | ${'no service capabilities hides create'}
    ${false}                   | ${true}                    | ${false}                         | ${false}     | ${'delete capability alone does not allow create'}
    ${false}                   | ${false}                   | ${true}                          | ${false}     | ${'manage access capability alone does not allow create'}
  `(
    'should render create button when shouldRender=$shouldRender ($description)',
    ({
      hasUpsertServiceCapability,
      hasDeleteServiceCapability,
      hasManageAccessServiceCapability,
      shouldRender,
    }) => {
      // Given
      mockUseServiceCapability.mockImplementation(
        (capability: ServiceRestriction) => {
          if (capability === ServiceRestriction.Upsert) {
            return hasUpsertServiceCapability;
          }
          if (capability === ServiceRestriction.Delete) {
            return hasDeleteServiceCapability;
          }
          return false;
        }
      );
      mockUseServiceCapabilityWithSubscriptionId.mockReturnValue({
        hasCapability: hasManageAccessServiceCapability,
        subscriptionId: SUBSCRIPTION_ID,
      });

      // When
      const { queryByRole } = renderEpicList({ serviceInstance });

      // Then
      const createButton = queryByRole('button', { name: 'Utils.Create' });
      if (!shouldRender) {
        expect(createButton).toBeNull();
        return;
      }
      expect(createButton).toBeInTheDocument();
    }
  );

  it('should render draft epics when user has upsert service capability', () => {
    // Given
    const draftForUpdateTitle = 'Draft epic for update';
    const epics = [
      makeEpic({
        id: 'draft-for-update',
        title: draftForUpdateTitle,
        active: false,
        timeline: Timeline.Now,
      }),
    ];
    mockUseServiceCapability.mockImplementation(
      (capability: ServiceRestriction) =>
        capability === ServiceRestriction.Upsert
    );

    // When
    renderEpicList({ epics, serviceInstance });

    // Then
    expect(screen.getByText(draftForUpdateTitle)).toBeInTheDocument();
  });

  it.each`
    hasManageServiceCapability | organizationCapabilities                             | isBypass | shouldRender | description
    ${true}                    | ${[]}                                                | ${false} | ${true}      | ${'service-level capability allows access management'}
    ${false}                   | ${[OrganizationCapability.AdministrateOrganization]} | ${false} | ${true}      | ${'organization administration allows access management'}
    ${false}                   | ${[OrganizationCapability.ManageSubscription]}       | ${false} | ${true}      | ${'subscription management allows access management'}
    ${false}                   | ${[]}                                                | ${true}  | ${true}      | ${'admin bypass allows access management'}
    ${false}                   | ${[]}                                                | ${false} | ${false}     | ${'missing capabilities hides access management'}
  `(
    'should render manage access link when shouldRender=$shouldRender ($description)',
    ({
      hasManageServiceCapability,
      organizationCapabilities,
      isBypass,
      shouldRender,
    }) => {
      // Given
      mockUseServiceCapabilityWithSubscriptionId.mockReturnValue({
        hasCapability: hasManageServiceCapability,
        subscriptionId: SUBSCRIPTION_ID,
      });
      mockUseAdminByPass.mockReturnValue(isBypass);

      // When
      const { queryByRole } = renderEpicList({}, organizationCapabilities);

      // Then
      const manageAccessLink = queryByRole('link', {
        name: 'Service.Capabilities.ManageAccessName',
      });
      if (!shouldRender) {
        expect(manageAccessLink).toBeNull();
        return;
      }

      expect(manageAccessLink).toHaveAttribute(
        'href',
        `/${APP_PATH}/manage/service/${SERVICE_INSTANCE_ID}/subscription/${SUBSCRIPTION_ID}`
      );
    }
  );
});
