import { RegistrationContext } from '@/components/registration/Context';
import { RegistrationLayout } from '@/components/registration/Layout';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { type AnalyticsElementId } from '@/lib/analytics/analytics.ids';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

const CANCEL_ANALYTICS_ID: AnalyticsElementId = 'platform_registration_cancel';
const CONFIRM_ANALYTICS_ID: AnalyticsElementId =
  'platform_reconnection_confirm';

const renderLayout = ({
  cancel,
  confirm,
}: { cancel?: () => void; confirm?: () => void } = {}) => {
  const children = <p>child content</p>;
  const cancelAction = { cancelAnalyticsId: CANCEL_ANALYTICS_ID };
  const confirmAction = { confirmAnalyticsId: CONFIRM_ANALYTICS_ID };
  const props: ComponentProps<typeof RegistrationLayout> =
    cancel && confirm
      ? { children, cancel, ...cancelAction, confirm, ...confirmAction }
      : cancel
        ? { children, cancel, ...cancelAction }
        : confirm
          ? { children, confirm, ...confirmAction }
          : { children };
  return testRender(
    <RegistrationContext.Provider
      value={{
        displayedIdentifier:
          PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
      }}>
      <RegistrationLayout {...props} />
    </RegistrationContext.Provider>
  );
};

describe('RegistrationLayout', () => {
  it('renders children', () => {
    renderLayout();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it.each`
    description       | cancel       | confirm
    ${'none'}         | ${undefined} | ${undefined}
    ${'cancel only'}  | ${() => {}}  | ${undefined}
    ${'confirm only'} | ${undefined} | ${() => {}}
    ${'both'}         | ${() => {}}  | ${() => {}}
  `(
    'shows correct buttons when $description provided',
    ({
      cancel,
      confirm,
    }: {
      cancel: (() => void) | undefined;
      confirm: (() => void) | undefined;
    }) => {
      renderLayout({ cancel, confirm });
      const cancelBtn = screen.queryByRole('button', { name: 'Register.Back' });
      const confirmBtn = screen.queryByRole('button', {
        name: 'Utils.Confirm',
      });
      cancel
        ? expect(cancelBtn).toBeInTheDocument()
        : expect(cancelBtn).not.toBeInTheDocument();
      confirm
        ? expect(confirmBtn).toBeInTheDocument()
        : expect(confirmBtn).not.toBeInTheDocument();
    }
  );

  it('calls cancel when the cancel button is clicked', async () => {
    const cancel = vi.fn();
    const { user } = renderLayout({ cancel });
    await user.click(screen.getByRole('button', { name: 'Register.Back' }));
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('calls confirm when the confirm button is clicked', async () => {
    const confirm = vi.fn();
    const { user } = renderLayout({ confirm });
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));
    expect(confirm).toHaveBeenCalledOnce();
  });
});
