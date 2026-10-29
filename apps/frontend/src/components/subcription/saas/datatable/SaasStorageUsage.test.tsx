import { SaasStorageUsage } from '@/components/subcription/saas/datatable/SaasStorageUsage';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';

const LABEL = 'CSMBoard.Database';
const USAGE_PERCENT = 57.4;
const ALERT_PROGRESS_BAR_CLASS =
  '[&>[data-slot=progress-bar-indicator]]:bg-feedback-alert-primary';

describe('SaasStorageUsage', () => {
  it('should display the usage rounded next to a bar filled with it', () => {
    // Given a storage with a known usage
    // When its usage is rendered
    testRender(
      <SaasStorageUsage
        percent={USAGE_PERCENT}
        label={LABEL}
        isHigh={false}
      />
    );

    // Then the bar is filled with the usage and the percentage is rounded
    expect(screen.getByRole('progressbar', { name: LABEL })).toHaveAttribute(
      'aria-valuenow',
      String(USAGE_PERCENT)
    );
    expect(screen.getByText('57%')).toBeInTheDocument();
  });

  it.each`
    description         | isHigh
    ${'in alert color'} | ${true}
    ${'in plain color'} | ${false}
  `('should display a usage rated high: $isHigh $description', ({ isHigh }) => {
    // Given a storage whose usage is rated high or not by the Hub
    // When its usage is rendered
    testRender(
      <SaasStorageUsage
        percent={USAGE_PERCENT}
        label={LABEL}
        isHigh={isHigh}
      />
    );

    // Then the bar and the percentage are in alert color only when the usage is high
    const bar = screen.getByRole('progressbar', { name: LABEL });
    const percentage = screen.getByText('57%');
    if (isHigh) {
      expect(bar).toHaveClass(ALERT_PROGRESS_BAR_CLASS);
      expect(percentage).toHaveClass('text-feedback-alert-primary');
    } else {
      expect(bar).not.toHaveClass(ALERT_PROGRESS_BAR_CLASS);
      expect(percentage).not.toHaveClass('text-feedback-alert-primary');
    }
  });

  it.each([[null], [undefined]])(
    'should display nothing for a storage of usage %s',
    (percent) => {
      // Given a storage the SaaS Manager has no measure of
      // When its usage is rendered
      const { container } = testRender(
        <SaasStorageUsage
          percent={percent}
          label={LABEL}
          isHigh={false}
        />
      );

      // Then neither a bar nor a percentage is shown
      expect(container).toBeEmptyDOMElement();
    }
  );
});
