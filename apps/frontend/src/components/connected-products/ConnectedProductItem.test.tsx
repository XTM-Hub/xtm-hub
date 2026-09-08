import { ConnectedPlatform } from '@/components/connected-products/useConnectedPlatforms';
import testRender from '@/utils/test/test-render';
import {
  PlatformContract,
  ServiceDefinitionIdentifier,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { ConnectedProductItem } from './ConnectedProductItem';

const t = useTranslations();

const buildPlatform = (
  overrides: Partial<ConnectedPlatform> = {}
): ConnectedPlatform => ({
  id: 'platform-1',
  platform_id: 'platform-1',
  title: 'my openaev instance',
  url: 'https://openaev.example.com',
  contract: PlatformContract.Ce,
  identifier: ServiceDefinitionIdentifier.OpenaevRegistration,
  subscription: {
    end_date: null,
    start_date: null,
    service_instance: { id: 'service-instance-1', name: 'instance' },
  },
  ...overrides,
});

describe('ConnectedProductItem', () => {
  it('shows the Trial badge when the contract is trial', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform({ contract: PlatformContract.Trial })}
        t={t}
      />
    );

    expect(
      screen.getByText('Header.ConnectedProducts.Trial')
    ).toBeInTheDocument();
  });

  it.each`
    contract               | description
    ${PlatformContract.Ce} | ${'CE'}
    ${PlatformContract.Ee} | ${'EE'}
  `(
    'does not show the Trial badge when the contract is $description',
    ({ contract }) => {
      testRender(
        <ConnectedProductItem
          platform={buildPlatform({ contract })}
          t={t}
        />
      );

      expect(
        screen.queryByText('Header.ConnectedProducts.Trial')
      ).not.toBeInTheDocument();
    }
  );

  it('shows the EE badge when the contract is EE', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform({ contract: PlatformContract.Ee })}
        t={t}
      />
    );

    expect(screen.getByText('Header.ConnectedProducts.EE')).toBeInTheDocument();
  });

  it.each`
    contract                  | description
    ${PlatformContract.Ce}    | ${'CE'}
    ${PlatformContract.Trial} | ${'trial'}
  `(
    'does not show the EE badge when the contract is $description',
    ({ contract }) => {
      testRender(
        <ConnectedProductItem
          platform={buildPlatform({ contract })}
          t={t}
        />
      );

      expect(
        screen.queryByText('Header.ConnectedProducts.EE')
      ).not.toBeInTheDocument();
    }
  );

  it.each`
    identifier                                         | description
    ${ServiceDefinitionIdentifier.OpenctiRegistration} | ${'OpenCTI'}
    ${ServiceDefinitionIdentifier.OpenaevRegistration} | ${'OpenAEV'}
    ${ServiceDefinitionIdentifier.XtmoneRegistration}  | ${'XTM One'}
  `(
    'renders the platform icon for a $description platform',
    ({ identifier }) => {
      const { container } = testRender(
        <ConnectedProductItem
          platform={buildPlatform({
            identifier,
            subscription: null,
            url: '',
          })}
          t={t}
        />
      );

      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  );

  it('renders the details button when a service instance is linked', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform()}
        t={t}
      />
    );

    expect(
      screen.getByLabelText('Header.ConnectedProducts.Details')
    ).toBeInTheDocument();
  });

  it('does not render the details button when no service instance is linked', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform({ subscription: null })}
        t={t}
      />
    );

    expect(
      screen.queryByLabelText('Header.ConnectedProducts.Details')
    ).not.toBeInTheDocument();
  });

  it('renders the go-to-platform button when a url is set', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform({ url: 'https://openaev.example.com' })}
        t={t}
      />
    );

    expect(
      screen.getByLabelText('Header.ConnectedProducts.GoToPlatform')
    ).toBeInTheDocument();
  });

  it('does not render the go-to-platform button when no url is set', () => {
    testRender(
      <ConnectedProductItem
        platform={buildPlatform({ url: '' })}
        t={t}
      />
    );

    expect(
      screen.queryByLabelText('Header.ConnectedProducts.GoToPlatform')
    ).not.toBeInTheDocument();
  });
});
