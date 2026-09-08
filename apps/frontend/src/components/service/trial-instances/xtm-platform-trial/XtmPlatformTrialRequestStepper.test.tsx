import { XtmPlatformTrialRequestStepper } from '@/components/service/trial-instances/xtm-platform-trial/XtmPlatformTrialRequestStepper';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('XtmPlatformTrialRequestStepper', () => {
  it.each`
    currentStepIndex | expectedCurrentStep
    ${0}             | ${'Pending'}
    ${1}             | ${'Provisioning'}
    ${2}             | ${'Active'}
  `(
    'highlights the "$expectedCurrentStep" step when currentStepIndex is $currentStepIndex',
    ({ currentStepIndex, expectedCurrentStep }) => {
      testRender(
        <XtmPlatformTrialRequestStepper currentStepIndex={currentStepIndex} />
      );

      const currentStepLabel = screen.getByText(
        `Service.Trials.XtmPlatform.Page.Status.Stepper.${expectedCurrentStep}`
      );
      expect(currentStepLabel).toHaveClass('text-feedback-success-primary');
    }
  );

  it('renders all three steps', () => {
    testRender(<XtmPlatformTrialRequestStepper currentStepIndex={0} />);

    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.Stepper.Pending')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.Trials.XtmPlatform.Page.Status.Stepper.Provisioning'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.Trials.XtmPlatform.Page.Status.Stepper.Active')
    ).toBeInTheDocument();
  });
});
