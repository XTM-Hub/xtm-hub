import { AppPortalContext } from '@/components/me/AppPortalContext';
import { SettingsPortalContext } from '@/components/settings/EnvPortalContext';
import { meContext_fragment$data } from '@generated/meContext_fragment.graphql';
import { settingsContext_fragment$data } from '@generated/settingsContext_fragment.graphql';
import messages from '@messages/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import { RelayEnvironmentProvider } from 'react-relay/hooks';
import { createMockEnvironment } from 'relay-test-utils';
import { RelayMockEnvironment } from 'relay-test-utils/lib/RelayModernMockEnvironment';

export interface ProvidersWrapperProps {
  children: ReactNode;
  me?: meContext_fragment$data;
  settings?: settingsContext_fragment$data;
  relayConfig?: RelayMockEnvironment;
}

export const generateMockUser = (
  me?: Partial<meContext_fragment$data> | null
) => {
  return {
    id: 'mock_id',
    email: 'user@filigran.io',
    first_name: 'Test',
    last_name: 'User',
    country: 'US',
    picture: '',
    selected_organization_id: 'org-test-456',
    capabilities: [],
    roles_portal: [],
    organizations: [
      {
        id: 'mock_id',
        name: 'Test Personal Space',
        personal_space: true,
      },
      {
        id: 'org-test-456',
        name: 'Test Organization',
        personal_space: false,
      },
    ],
    ' $fragmentType': 'context_fragment',
    ...me,
  } as meContext_fragment$data;
};

export const generateSettings = (
  settings?: Partial<settingsContext_fragment$data> | null
) => {
  return {
    platform_providers: [
      {
        name: 'local',
        provider: 'local',
        type: 'FORM',
      },
      {
        name: 'Login',
        provider: 'oidc',
        type: 'SSO',
      },
    ],
    environment: 'local',
    base_url_front: 'http://localhost:3002',
    platform_feature_flags: ['*'],
    ...settings,
  } as settingsContext_fragment$data;
};
export const ProvidersWrapper = ({
  children,
  relayConfig,
  me,
  settings,
}: ProvidersWrapperProps) => {
  const relayEnv = relayConfig ?? createMockEnvironment();
  return (
    <RelayEnvironmentProvider environment={relayEnv}>
      <SettingsPortalContext settings={settings}>
        <AppPortalContext me={me}>{children}</AppPortalContext>
      </SettingsPortalContext>
    </RelayEnvironmentProvider>
  );
};

interface TestRenderOptions {
  relayConfig?: RelayMockEnvironment;
  /** The react-query client to render with, to seed or inspect its cache. */
  queryClient?: QueryClient;
  me?: Partial<meContext_fragment$data> | null;
  settings?: Partial<settingsContext_fragment$data> | null;
}

/**
 * Renders a React component to test it.
 *
 * @param ui The React component to test.
 * @param options (optional) Options to configure mocked providers needed to render the component.
 * @returns Rendered component we can manipulate and make assertions on.
 */
const testRender = (ui: ReactNode, options?: TestRenderOptions) => {
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestWrapper options={options}>{children}</TestWrapper>
      ),
    }),
  };
};

interface TestWrapperProps {
  options?: TestRenderOptions;
  children: ReactNode;
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const TestWrapper = ({ options, children }: TestWrapperProps) => {
  const { relayConfig, me, settings, queryClient } = options ?? {};

  return (
    <QueryClientProvider client={queryClient ?? createTestQueryClient()}>
      <ProvidersWrapper
        relayConfig={relayConfig}
        me={generateMockUser(me)}
        settings={generateSettings(settings)}>
        <NextIntlClientProvider
          locale={'en'}
          messages={messages}>
          {children}
        </NextIntlClientProvider>
      </ProvidersWrapper>
    </QueryClientProvider>
  );
};

export const testRenderHook = <Result, Props>(
  hook: (initialProps: Props) => Result,
  options?: TestRenderOptions
) => {
  const wrapper = ({ children }: ProvidersWrapperProps) => {
    return (
      <TestWrapper
        options={{
          ...options,
        }}>
        {children}
      </TestWrapper>
    );
  };
  return renderHook(hook, { wrapper });
};

export default testRender;
