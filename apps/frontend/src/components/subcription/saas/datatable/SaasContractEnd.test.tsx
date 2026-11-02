import { SaasContractEnd } from '@/components/subcription/saas/datatable/SaasContractEnd';
import testRender from '@/utils/test/test-render';
import { TooltipProvider } from '@filigran/design-system';
import { SaasPlatformContractStatus } from '@graphql/generated';
import { fireEvent, screen, within } from '@testing-library/react';
import { useTranslations } from 'next-intl';

const CONTRACT_END_DATE = '2027-03-15T12:00:00.000Z';

const renderContractEnd = (
  endDate: string,
  contractStatus: SaasPlatformContractStatus | null
) =>
  testRender(
    <TooltipProvider>
      <SaasContractEnd
        endDate={endDate}
        contractStatus={contractStatus}
      />
    </TooltipProvider>
  );

const mockTranslationsWithValues = () =>
  vi
    .mocked(useTranslations)
    .mockReturnValue(((key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key) as ReturnType<
      typeof useTranslations
    >);

describe('SaasContractEnd', () => {
  afterEach(() => {
    vi.useRealTimers();
    // Back to the translator of setup-vitest, which gives back the bare key
    vi.mocked(useTranslations).mockReset();
  });

  it('should display the exact contract end date in a tooltip on the days left', async () => {
    // Given a contract with an end date
    renderContractEnd(CONTRACT_END_DATE, SaasPlatformContractStatus.Active);
    expect(screen.queryByText('Mar 15, 2027')).not.toBeInTheDocument();

    // When the user focuses the days left of the contract
    fireEvent.focus(screen.getByText('CSMBoard.EndsIn'));

    // Then a tooltip shows the exact end date
    const tooltip = await screen.findByRole('tooltip');
    expect(within(tooltip).getByText('Mar 15, 2027')).toBeInTheDocument();
  });

  it.each`
    description               | endDate                       | contractStatus                           | days  | className
    ${'in 90 days or more'}   | ${'2027-01-26T12:00:00.000Z'} | ${SaasPlatformContractStatus.Active}     | ${90} | ${'text-default-secondary'}
    ${'in less than 90 days'} | ${'2027-01-25T12:00:00.000Z'} | ${SaasPlatformContractStatus.EndingSoon} | ${89} | ${'text-feedback-warning-primary'}
  `(
    'should display the $days days left on a contract that ends $description in $className',
    ({ endDate, contractStatus, days, className }) => {
      // Given a contract that ends at a known date from now
      vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-10-28T12:00:00.000Z'),
      });
      mockTranslationsWithValues();

      // When its end is rendered
      renderContractEnd(endDate, contractStatus);

      // Then the days left are shown, colored after how soon the contract ends
      expect(
        screen.getByText(`CSMBoard.EndsIn:${JSON.stringify({ days })}`)
      ).toHaveClass(className);
    }
  );

  it('should display an ended contract as ended, in red, with its end date in a tooltip', async () => {
    // Given a contract that ended 40 days ago
    renderContractEnd(
      '2026-09-18T12:00:00.000Z',
      SaasPlatformContractStatus.Ended
    );

    // When the user focuses its end
    const contractEnd = screen.getByText('CSMBoard.ContractEnded');
    fireEvent.focus(contractEnd);

    // Then it reads ended, in red, not as days left, and the tooltip shows its date
    expect(contractEnd).toHaveClass('text-feedback-error-primary');
    expect(screen.queryByText(/^CSMBoard\.EndsIn/)).not.toBeInTheDocument();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });
});
