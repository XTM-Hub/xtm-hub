import { TrialUserDialog } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/TrialUserDialog';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

interface AddFormStubProps {
  serviceInstanceId: string;
  products: PlatformIdentifier[];
  onCompleted: () => void;
  onCancel: () => void;
}

interface EditFormStubProps extends AddFormStubProps {
  initialUserIds: string[];
}

const addFormPropsSpy = vi.hoisted(() => vi.fn());
const editFormPropsSpy = vi.hoisted(() => vi.fn());

vi.mock('./AddTrialUserForm', () => ({
  AddTrialUserForm: (props: AddFormStubProps) => {
    addFormPropsSpy(props);
    const { onCompleted, onCancel } = props;
    return (
      <div>
        <span>AddTrialUserForm stub</span>
        <button onClick={onCompleted}>stub-add-completed</button>
        <button onClick={onCancel}>stub-add-cancel</button>
      </div>
    );
  },
}));

vi.mock('./EditTrialUsersForm', () => ({
  EditTrialUsersForm: (props: EditFormStubProps) => {
    editFormPropsSpy(props);
    const { onCompleted, onCancel } = props;
    return (
      <div>
        <span>EditTrialUsersForm stub</span>
        <button onClick={onCompleted}>stub-edit-completed</button>
        <button onClick={onCancel}>stub-edit-cancel</button>
      </div>
    );
  },
}));

const products = [PlatformIdentifier.Opencti, PlatformIdentifier.Xtmone];

describe('TrialUserDialog', () => {
  it('renders nothing when closed', () => {
    testRender(
      <TrialUserDialog
        mode="add"
        serviceInstanceId="bundle-1"
        products={products}
        open={false}
        setOpen={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Service.Bundle.ManageTrial.AddUserDialog.Title')
    ).not.toBeInTheDocument();
  });

  it('shows the add title and renders AddTrialUserForm with the expected props in "add" mode', () => {
    testRender(
      <TrialUserDialog
        mode="add"
        serviceInstanceId="bundle-1"
        products={products}
        open
        setOpen={vi.fn()}
      />
    );

    expect(
      screen.getByText('Service.Bundle.ManageTrial.AddUserDialog.Title')
    ).toBeInTheDocument();
    expect(screen.getByText('AddTrialUserForm stub')).toBeInTheDocument();
    expect(
      screen.queryByText('EditTrialUsersForm stub')
    ).not.toBeInTheDocument();
    expect(addFormPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceInstanceId: 'bundle-1',
        products,
      })
    );
  });

  it('shows the edit title and renders EditTrialUsersForm with the expected props in "edit" mode', () => {
    testRender(
      <TrialUserDialog
        mode="edit"
        serviceInstanceId="bundle-1"
        products={products}
        initialUserIds={['user-1', 'user-2']}
        open
        setOpen={vi.fn()}
      />
    );

    expect(
      screen.getByText('Service.Bundle.ManageTrial.EditUsersDialog.Title')
    ).toBeInTheDocument();
    expect(screen.getByText('EditTrialUsersForm stub')).toBeInTheDocument();
    expect(screen.queryByText('AddTrialUserForm stub')).not.toBeInTheDocument();
    expect(editFormPropsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceInstanceId: 'bundle-1',
        products,
        initialUserIds: ['user-1', 'user-2'],
      })
    );
  });

  it('closes the dialog when the add form completes', async () => {
    const setOpen = vi.fn();
    const { user } = testRender(
      <TrialUserDialog
        mode="add"
        serviceInstanceId="bundle-1"
        products={products}
        open
        setOpen={setOpen}
      />
    );

    await user.click(screen.getByText('stub-add-completed'));

    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('closes the dialog when the add form is cancelled', async () => {
    const setOpen = vi.fn();
    const { user } = testRender(
      <TrialUserDialog
        mode="add"
        serviceInstanceId="bundle-1"
        products={products}
        open
        setOpen={setOpen}
      />
    );

    await user.click(screen.getByText('stub-add-cancel'));

    expect(setOpen).toHaveBeenCalledWith(false);
  });

  it('closes the dialog when the edit form completes', async () => {
    const setOpen = vi.fn();
    const { user } = testRender(
      <TrialUserDialog
        mode="edit"
        serviceInstanceId="bundle-1"
        products={products}
        initialUserIds={['user-1']}
        open
        setOpen={setOpen}
      />
    );

    await user.click(screen.getByText('stub-edit-completed'));

    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
