import { RegistrationContext } from '@/components/registration/Context';
import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { UnregisterConfirm } from '@/components/registration/unregister/Confirm';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const renderConfirm = (
  props: { confirm?: () => void; cancel?: () => void } = {}
) =>
  testRender(
    <RegistrationContext.Provider
      value={{
        displayedIdentifier:
          PlatformMetadataMapping[PlatformIdentifier.Opencti].name,
      }}>
      <UnregisterConfirm
        organizationName="Test Organization"
        confirm={props.confirm ?? vi.fn()}
        cancel={props.cancel ?? vi.fn()}
      />
    </RegistrationContext.Provider>
  );

describe('UnregisterConfirm', () => {
  it('renders the confirmation title and description', () => {
    renderConfirm();
    expect(screen.getByText('Unregister.Confirm.Title')).toBeInTheDocument();
    expect(
      screen.getByText('Unregister.Confirm.Description')
    ).toBeInTheDocument();
  });

  it('calls confirm when the confirm button is clicked', async () => {
    const confirm = vi.fn();
    const { user } = renderConfirm({ confirm });
    await user.click(screen.getByRole('button', { name: 'Utils.Confirm' }));
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('calls cancel when the cancel button is clicked', async () => {
    const cancel = vi.fn();
    const { user } = renderConfirm({ cancel });
    await user.click(screen.getByRole('button', { name: 'Register.Back' }));
    expect(cancel).toHaveBeenCalledOnce();
  });
});
