import { RegisteredPlatformOverview } from '@/components/service/registration/RegisteredPlatformOverview';
import {
  basePlatform,
  trialPlatform,
} from '@/components/service/registration/registered-platform.fixtures';
import testRender from '@/utils/test/test-render';
import { registeredPlatformByServiceInstanceId_fragment$data } from '@generated/registeredPlatformByServiceInstanceId_fragment.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { act, screen, within } from '@testing-library/react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import { describe, expect, it, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockPlatformData: registeredPlatformByServiceInstanceId_fragment$data | null;

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal()),
  useLazyLoadQuery: vi.fn(() => ({ registeredPlatform: mockPlatformData })),
  useFragment: () => mockPlatformData,
  useMutation: () => [vi.fn(), false],
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SERVICE_INSTANCE_ID = 'service instance/id';
const NOT_FOUND_ERROR = 'NEXT_NOT_FOUND';
const TRIAL_WELCOME = 'Service.Trials.PageHeader.Welcome';
const learnMoreTitle = (platformIdentifier: PlatformIdentifier) =>
  `Service.Trials.LearnMore.${platformIdentifier}.WhatCanYouDo.Title`;

const renderOverview = async (
  platform: registeredPlatformByServiceInstanceId_fragment$data | null,
  platformIdentifier: PlatformIdentifier = PlatformIdentifier.Opencti
) => {
  mockPlatformData = platform;
  await act(async () => {
    testRender(
      <Suspense>
        <RegisteredPlatformOverview
          params={Promise.resolve({
            serviceInstanceId: encodeURIComponent(SERVICE_INSTANCE_ID),
          })}
          platformIdentifier={platformIdentifier}
        />
      </Suspense>
    );
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisteredPlatformOverview', () => {
  it('should load the registered platform of the decoded service instance id', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    expect(useLazyLoadQuery).toHaveBeenCalledWith(expect.anything(), {
      input: { service_instance_id: SERVICE_INSTANCE_ID },
    });
  });

  it('should redirect to the not found page when the platform is not visible to the user', async () => {
    // Given
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error(NOT_FOUND_ERROR);
    });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    // When
    await renderOverview(null).catch(() => undefined);

    // Then
    expect(notFound).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should display the platform title in the breadcrumb', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    const breadcrumb = screen
      .getByRole('link', { name: 'MenuLinks.Home' })
      .closest('nav') as HTMLElement;
    expect(
      within(breadcrumb).getByText(basePlatform.title)
    ).toBeInTheDocument();
  });

  it('should display the platform header and its information', async () => {
    // Given / When
    await renderOverview(basePlatform);

    // Then
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Register.Details.PlatformInformation',
      })
    ).toBeInTheDocument();
  });

  it.each`
    section         | text
    ${'header'}     | ${TRIAL_WELCOME}
    ${'learn more'} | ${learnMoreTitle(PlatformIdentifier.Opencti)}
  `(
    'should not display the trial $section when the platform is not a trial',
    async ({ text }) => {
      // Given / When
      await renderOverview(basePlatform);

      // Then
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  );

  it('should display the trial header when the platform is a trial', async () => {
    // Given / When
    await renderOverview(trialPlatform);

    // Then
    expect(screen.getByText(TRIAL_WELCOME)).toBeInTheDocument();
  });

  it.each([[PlatformIdentifier.Opencti], [PlatformIdentifier.Openaev]])(
    'should display the %s learn more section when the platform is a trial',
    async (platformIdentifier) => {
      // Given / When
      await renderOverview(trialPlatform, platformIdentifier);

      // Then
      expect(
        screen.getByText(learnMoreTitle(platformIdentifier))
      ).toBeInTheDocument();
    }
  );
});
