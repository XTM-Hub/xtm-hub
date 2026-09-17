import { XtmPlatformTrialMessagePanel } from '@/components/service/trial-instances/xtm-platform-trial/request-panel/XtmPlatformTrialMessagePanel';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('XtmPlatformTrialMessagePanel', () => {
  it('renders the title and description', () => {
    render(
      <XtmPlatformTrialMessagePanel
        title="Panel title"
        description="Panel description"
      />
    );

    expect(screen.getByText('Panel title')).toBeInTheDocument();
    expect(screen.getByText('Panel description')).toBeInTheDocument();
  });

  it('does not render an actions container when no actions are provided', () => {
    const { container } = render(
      <XtmPlatformTrialMessagePanel
        title="Panel title"
        description="Panel description"
      />
    );

    expect(container.querySelector('.justify-end')).not.toBeInTheDocument();
  });

  it('renders the provided actions', () => {
    render(
      <XtmPlatformTrialMessagePanel
        title="Panel title"
        description="Panel description"
        actions={<button type="button">Do something</button>}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Do something' })
    ).toBeInTheDocument();
  });
});
