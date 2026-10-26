import { StorageHeader } from '@/components/service/registration/StorageHeader';
import { storageUsageStatus } from '@/components/service/registration/storage-usage-chart.utils';
import { mockTranslations } from '@/utils/test/mock-translations';
import testRender from '@/utils/test/test-render';
import { SaasPlatformStorageUsage } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const UNAVAILABLE = 'Register.Metrics.Unavailable';

const storage: SaasPlatformStorageUsage = {
  percent: 50,
  used: 1_500_000_000,
  limit: 3_000_000_000,
  time: '2026-10-23T13:46:23.624Z',
};

const formatSize = (bytes: number) => `${bytes / 1_000_000_000} GB`;

interface UsedOfLimitValues {
  used: string;
  limit: string;
  highlight: (chunks: ReactNode) => ReactNode;
  secondary: (chunks: ReactNode) => ReactNode;
}

// Render the tagged parts the way the message would, to check their styling.
const mockRichTranslations = () => {
  const rich = vi.fn((key: string, values: UsedOfLimitValues) => (
    <>
      {values.highlight(values.used)}
      {values.secondary(`${key} ${values.limit}`)}
    </>
  ));
  vi.mocked(useTranslations).mockReturnValue(
    Object.assign(mockTranslations(), { rich }) as unknown as ReturnType<
      typeof useTranslations
    >
  );
  return rich;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('StorageHeader', () => {
  it('should show the used storage highlighted out of the limit in a single message', () => {
    // Given
    const rich = mockRichTranslations();

    // When
    testRender(
      <StorageHeader
        storage={storage}
        usageStatus={storageUsageStatus(50)}
        formatSize={formatSize}
      />
    );

    // Then
    expect(rich).toHaveBeenCalledWith(
      'Register.Metrics.UsedOfLimit',
      expect.objectContaining({ used: '1.5 GB', limit: '3 GB' })
    );
    expect(screen.getByText('1.5 GB')).toHaveClass(
      'text-lg',
      'content-highlight'
    );
    expect(screen.getByText('Register.Metrics.UsedOfLimit 3 GB')).toHaveClass(
      'text-default-secondary'
    );
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  it.each`
    case                      | missingStorage
    ${'missing'}              | ${null}
    ${'without a limit'}      | ${{ ...storage, limit: null }}
    ${'with a limit of zero'} | ${{ ...storage, limit: 0, percent: 0 }}
    ${'without a usage'}      | ${{ ...storage, used: null }}
  `(
    'should show the unavailable copy instead of the usage when the storage is $case',
    ({ missingStorage }) => {
      // Given
      const rich = mockRichTranslations();

      // When
      testRender(
        <StorageHeader
          storage={missingStorage}
          usageStatus={null}
          formatSize={formatSize}
        />
      );

      // Then
      expect(screen.getByText(UNAVAILABLE)).toHaveClass('text-sm');
      expect(rich).not.toHaveBeenCalled();
      expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    }
  );

  it('should show a reported usage of zero out of the limit', () => {
    // Given
    const rich = mockRichTranslations();

    // When
    testRender(
      <StorageHeader
        storage={{ ...storage, used: 0, percent: 0 }}
        usageStatus={storageUsageStatus(0)}
        formatSize={formatSize}
      />
    );

    // Then
    expect(rich).toHaveBeenCalledWith(
      'Register.Metrics.UsedOfLimit',
      expect.objectContaining({ used: '0 GB', limit: '3 GB' })
    );
    expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
  });

  it('should show the percentage rounded to one decimal in the colour of the usage status', () => {
    // Given
    const usageStatus = storageUsageStatus(62.345);

    // When
    testRender(
      <StorageHeader
        storage={{ ...storage, percent: 62.345 }}
        usageStatus={usageStatus}
        formatSize={formatSize}
      />
    );

    // Then
    expect(screen.getByText('62.3%')).toHaveClass(usageStatus.colorClass);
  });

  it('should not show the percentage without a usage status', () => {
    // Given / When
    testRender(
      <StorageHeader
        storage={storage}
        usageStatus={null}
        formatSize={formatSize}
      />
    );

    // Then
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});
