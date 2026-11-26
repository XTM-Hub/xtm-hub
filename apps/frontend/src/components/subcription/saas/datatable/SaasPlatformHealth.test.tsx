import { SaasPlatformHealth } from '@/components/subcription/saas/datatable/SaasPlatformHealth';
import testRender from '@/utils/test/test-render';
import { TooltipProvider } from '@filigran/design-system';
import {
  SaasPlatformHealthIssue,
  type SaasPlatformRowFragment,
} from '@graphql/generated';
import { fireEvent, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';

const AVAILABILITY = 0.9996;
const DATABASE_USAGE_PERCENT = 57.4;
const FILE_STORAGE_USAGE_PERCENT = 93;

type HealthPlatform = Pick<
  SaasPlatformRowFragment,
  'health_issues' | 'sla_cmtd' | 'storage'
>;

const buildPlatform = (
  overrides: Partial<HealthPlatform> = {}
): HealthPlatform => ({
  sla_cmtd: AVAILABILITY,
  storage: {
    es_used_size: { percent: DATABASE_USAGE_PERCENT },
    s3_used_size: { percent: FILE_STORAGE_USAGE_PERCENT },
  },
  health_issues: [],
  ...overrides,
});

const renderHealth = (platform: HealthPlatform) =>
  testRender(
    <TooltipProvider>
      <SaasPlatformHealth platform={platform} />
    </TooltipProvider>
  );

const mockTranslationsWithValues = () =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(((key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key) as ReturnType<
      typeof useTranslations
    >);

// The tone of a chip is painted on its root, around the label
const getChipByLabel = (label: string) =>
  screen.getByText(label).closest('[class*="bg-feedback-"]');

describe('SaasPlatformHealth', () => {
  afterEach(() => {
    // Back to the translator of setup-vitest, which gives back the bare key
    vi.mocked(useTranslations).mockReset();
  });

  it('should display a green health chip for a saas platform without any issue', () => {
    // Given a saas platform whose availability and storages are all fine
    // When its health is rendered
    renderHealth(
      buildPlatform({
        sla_cmtd: 1,
        storage: {
          es_used_size: { percent: DATABASE_USAGE_PERCENT },
          s3_used_size: { percent: DATABASE_USAGE_PERCENT },
        },
        health_issues: [],
      })
    );

    // Then its health is a green chip
    expect(getChipByLabel('CSMBoard.Healthy')).toHaveClass(
      'bg-feedback-success-secondary-transparency-30'
    );
  });

  it.each`
    description                         | overrides                                                                                                                                        | label                                             | className
    ${'misses its SLA'}                 | ${{ storage: { es_used_size: { percent: 12 }, s3_used_size: { percent: 12 } }, health_issues: [SaasPlatformHealthIssue.Availability] }}          | ${'CSMBoard.HealthSla:{"percent":"99.96%"}'}      | ${'bg-feedback-error-secondary-transparency-30'}
    ${'has a nearly full database'}     | ${{ sla_cmtd: 1, storage: { es_used_size: { percent: 85 }, s3_used_size: { percent: 12 } }, health_issues: [SaasPlatformHealthIssue.Database] }} | ${'CSMBoard.HealthDatabase:{"percent":"85%"}'}    | ${'bg-feedback-alert-secondary-transparency-30'}
    ${'has a nearly full file storage'} | ${{ sla_cmtd: 1, health_issues: [SaasPlatformHealthIssue.FileStorage] }}                                                                         | ${'CSMBoard.HealthFileStorage:{"percent":"93%"}'} | ${'bg-feedback-alert-secondary-transparency-30'}
  `(
    'should display a health chip naming the issue of a saas platform that $description',
    ({ overrides, label, className }) => {
      // Given a saas platform with a single issue
      mockTranslationsWithValues();

      // When its health is rendered
      renderHealth(buildPlatform(overrides));

      // Then its health chip names the measure and its value, in the tone of the issue
      expect(getChipByLabel(label)).toHaveClass(className);
      expect(screen.queryByText('CSMBoard.Healthy')).not.toBeInTheDocument();
    }
  );

  it('should display the most severe health issue with the count of the others, listed in a tooltip', async () => {
    // Given a saas platform that misses its SLA and whose storages are nearly full
    mockTranslationsWithValues();
    renderHealth(
      buildPlatform({
        storage: {
          es_used_size: { percent: 85 },
          s3_used_size: { percent: FILE_STORAGE_USAGE_PERCENT },
        },
        health_issues: [
          SaasPlatformHealthIssue.Availability,
          SaasPlatformHealthIssue.Database,
          SaasPlatformHealthIssue.FileStorage,
        ],
      })
    );

    // When the user focuses its health chip
    const chipLabel = 'CSMBoard.HealthSla:{"percent":"99.96%"} +2';
    expect(getChipByLabel(chipLabel)).toHaveClass(
      'bg-feedback-error-secondary-transparency-30'
    );
    fireEvent.focus(getChipByLabel(chipLabel)!);

    // Then a tooltip lists the other issues
    const tooltip = await screen.findByRole('tooltip');
    for (const label of [
      'CSMBoard.HealthDatabase:{"percent":"85%"}',
      'CSMBoard.HealthFileStorage:{"percent":"93%"}',
    ]) {
      expect(within(tooltip).getByText(label)).toBeInTheDocument();
    }
  });

  it('should display no health for a saas platform the SaaS Manager has no measure of', () => {
    // Given a saas platform without any storage usage nor availability
    // When its health is rendered
    const { container } = renderHealth(
      buildPlatform({ sla_cmtd: null, storage: null, health_issues: null })
    );

    // Then no health chip is shown
    expect(container).toBeEmptyDOMElement();
  });
});
