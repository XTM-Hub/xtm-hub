import { SettingsContext as SettingsReactContext } from '@/components/settings/EnvPortalContext';
import testRender from '@/utils/test/test-render';
import { mockSettings } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { ReactNode, useContext } from 'react';
import { describe, expect, it, vi } from 'vitest';
import PageLoader from './page-loader';

const mocks = vi.hoisted(() => ({
  useSettingsQuery: vi.fn(),
}));

vi.mock('@graphql/generated', async (importOriginal) => {
  const { mockGeneratedQueryHooks } =
    await import('@/utils/test/mock-generated-query');
  return mockGeneratedQueryHooks(importOriginal, {
    useSettingsQuery: mocks.useSettingsQuery,
  });
});

vi.mock('react-relay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-relay')>()),
  useQueryLoader: () => [{}, vi.fn()],
}));

// The Relay user context is not under test: it only renders the page.
vi.mock('@/components/me/MeContext', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const BASE_URL_FRONT = 'https://hub.filigran.io';

const BaseUrlFront = () => {
  const { settings } = useContext(SettingsReactContext);
  return <p>{settings?.base_url_front}</p>;
};

describe('PageLoader', () => {
  it('should give the loaded settings to the page', () => {
    // Given
    mocks.useSettingsQuery.mockReturnValue({
      data: { settings: mockSettings({ base_url_front: BASE_URL_FRONT }) },
    });

    // When
    testRender(
      <PageLoader>
        <BaseUrlFront />
      </PageLoader>
    );

    // Then
    expect(screen.getByText(BASE_URL_FRONT)).toBeInTheDocument();
  });
});
