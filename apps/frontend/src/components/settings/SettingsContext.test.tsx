import { SettingsContext as SettingsReactContext } from '@/components/settings/EnvPortalContext';
import SettingsContext from '@/components/settings/SettingsContext';
import testRender from '@/utils/test/test-render';
import { mockSettings } from '@graphql/mocks';
import { screen } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const BASE_URL_FRONT = 'https://hub.filigran.io';

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

const BaseUrlFront = () => {
  const { settings } = useContext(SettingsReactContext);
  return <p>{settings?.base_url_front}</p>;
};

const renderWithSettings = () =>
  testRender(
    <SettingsContext>
      <BaseUrlFront />
    </SettingsContext>
  );

describe('SettingsContext', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should give the loaded settings to its children', () => {
    // Given
    mocks.useSettingsQuery.mockReturnValue({
      data: {
        settings: mockSettings({ base_url_front: BASE_URL_FRONT }),
      },
    });

    // When
    renderWithSettings();

    // Then
    expect(screen.getByText(BASE_URL_FRONT)).toBeInTheDocument();
  });

  it('should render nothing while the settings are loading', () => {
    // Given
    mocks.useSettingsQuery.mockReturnValue({ data: undefined });

    // When
    const { container } = renderWithSettings();

    // Then
    expect(container).toBeEmptyDOMElement();
  });
});
