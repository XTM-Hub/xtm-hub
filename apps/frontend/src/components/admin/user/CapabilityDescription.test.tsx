import { CapabilityDescription } from '@/components/admin/user/CapabilityDescription';
import { mockTranslations } from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

const DESCRIPTION_KEY_PREFIX = 'CapabilityDescription.Capabilities.';
const MANAGE_ACCESS_DESCRIPTION = `${DESCRIPTION_KEY_PREFIX}MANAGE_ACCESS`;
const MANAGE_ACCESS_LABEL = 'MANAGE ACCESS';
const MANAGE_SUBSCRIPTION_DESCRIPTION = `${DESCRIPTION_KEY_PREFIX}MANAGE_SUBSCRIPTION`;
const MANAGE_SUBSCRIPTION_LABEL = 'MANAGE SUBSCRIPTION';
const DOCUMENTED_KEYS = [
  MANAGE_ACCESS_DESCRIPTION,
  MANAGE_SUBSCRIPTION_DESCRIPTION,
];

const documentOnly = (documentedKeys: string[]) =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(
      mockTranslations({ has: (key) => documentedKeys.includes(key) })
    );

describe('CapabilityDescription', () => {
  it('should explain what the capabilities are for', () => {
    // Given / When
    testRender(<CapabilityDescription />);

    // Then
    expect(
      screen.getByRole('heading', { name: 'CapabilityDescription.Title' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('CapabilityDescription.Description')
    ).toBeInTheDocument();
  });

  it('should describe each capability that has a description', () => {
    // Given
    documentOnly(DOCUMENTED_KEYS);

    // When
    testRender(<CapabilityDescription />);

    // Then
    expect(screen.getByText(MANAGE_ACCESS_LABEL)).toBeInTheDocument();
    expect(screen.getByText(MANAGE_ACCESS_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(MANAGE_SUBSCRIPTION_LABEL)).toBeInTheDocument();
    expect(
      screen.getByText(MANAGE_SUBSCRIPTION_DESCRIPTION)
    ).toBeInTheDocument();
  });

  it('should not list a capability that has no description', () => {
    // Given
    documentOnly([MANAGE_ACCESS_DESCRIPTION]);

    // When
    testRender(<CapabilityDescription />);

    // Then
    expect(screen.getByText(MANAGE_ACCESS_LABEL)).toBeInTheDocument();
    expect(
      screen.queryByText(MANAGE_SUBSCRIPTION_LABEL)
    ).not.toBeInTheDocument();
  });
});
