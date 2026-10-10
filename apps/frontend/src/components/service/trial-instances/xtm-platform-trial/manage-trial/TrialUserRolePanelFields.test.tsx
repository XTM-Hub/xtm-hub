import {
  RolePanelConfig,
  trialUserRolesFormSchema,
  TrialUserRolesFormValues,
} from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/manage-trial.const';
import { MixedRoleDefault } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/manage-trial.utils';
import { TrialUserRolePanelFields } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/TrialUserRolePanelFields';
import { Form } from '@/components/ui/form';
import testRender from '@/utils/test/test-render';
import { PlatformIdentifier, ServiceGroupName } from '@graphql/generated';
import { zodResolver } from '@hookform/resolvers/zod';
import { screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

const bundleRolePanels: RolePanelConfig[] = [
  {
    platform: PlatformIdentifier.Opencti,
    roles: [ServiceGroupName.Admin, ServiceGroupName.Reader],
  },
  {
    platform: PlatformIdentifier.Xtmone,
    roles: [ServiceGroupName.Admin, ServiceGroupName.User],
    defaultRole: ServiceGroupName.User,
  },
];

const openctiTitle = 'Service.Bundle.ManageTrial.Roles.opencti.Title';
const xtmoneTitle = 'Service.Bundle.ManageTrial.Roles.xtmone.Title';
const noAccessLabel = 'Service.Bundle.ManageTrial.Roles.NoAccess';
const mixedRolesText = 'Service.Bundle.ManageTrial.EditUsersDialog.MixedRoles';

const getRoleCombobox = (title: string) =>
  screen.getByRole('combobox', { name: title });

interface WrapperProps {
  mixedRoleDefaults?: Partial<Record<PlatformIdentifier, MixedRoleDefault>>;
  onSubmit: (values: TrialUserRolesFormValues) => void;
}

const Wrapper = ({ mixedRoleDefaults, onSubmit }: WrapperProps) => {
  const form = useForm<TrialUserRolesFormValues>({
    resolver: zodResolver(trialUserRolesFormSchema),
    defaultValues: { userIds: ['user-1'], xtmoneRole: ServiceGroupName.User },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <TrialUserRolePanelFields
          control={form.control}
          bundleRolePanels={bundleRolePanels}
          mixedRoleDefaults={mixedRoleDefaults}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
};

describe('TrialUserRolePanelFields', () => {
  it('renders one panel per bundle role panel', () => {
    testRender(<Wrapper onSubmit={vi.fn()} />);

    expect(screen.getByText(openctiTitle)).toBeInTheDocument();
    expect(screen.getByText(xtmoneTitle)).toBeInTheDocument();
  });

  it('defaults an untouched optional platform to "No access"', () => {
    testRender(<Wrapper onSubmit={vi.fn()} />);

    expect(getRoleCombobox(openctiTitle)).toHaveTextContent(noAccessLabel);
  });

  it('defaults an untouched mandatory XTM One platform to its panel default role, with no "No access" option', async () => {
    const { user } = testRender(<Wrapper onSubmit={vi.fn()} />);

    const xtmoneCombobox = getRoleCombobox(xtmoneTitle);
    expect(xtmoneCombobox).toHaveTextContent(
      'Service.Bundle.ManageTrial.Roles.xtmone.User.Label'
    );

    await user.click(xtmoneCombobox);
    expect(
      screen.queryByRole('option', { name: noAccessLabel })
    ).not.toBeInTheDocument();
  });

  it('shows a blank placeholder and the mixed-roles helper text for an untouched mixed platform', () => {
    testRender(
      <Wrapper
        onSubmit={vi.fn()}
        mixedRoleDefaults={{
          [PlatformIdentifier.Opencti]: { isMixed: true },
        }}
      />
    );

    expect(getRoleCombobox(openctiTitle)).toHaveTextContent(openctiTitle);
    expect(screen.getByText(mixedRolesText)).toBeInTheDocument();
  });

  it('clears the mixed-roles helper text once the field is touched', async () => {
    const { user } = testRender(
      <Wrapper
        onSubmit={vi.fn()}
        mixedRoleDefaults={{
          [PlatformIdentifier.Opencti]: { isMixed: true },
        }}
      />
    );

    await user.click(getRoleCombobox(openctiTitle));
    await user.click(
      screen.getByRole('option', {
        name: 'Service.Bundle.ManageTrial.Roles.opencti.Admin.Label',
      })
    );

    expect(screen.queryByText(mixedRolesText)).not.toBeInTheDocument();
  });

  it('submits undefined for an optional platform when "No access" is selected', async () => {
    const onSubmit = vi.fn();
    const { user } = testRender(<Wrapper onSubmit={onSubmit} />);

    await user.click(getRoleCombobox(openctiTitle));
    await user.click(screen.getByRole('option', { name: noAccessLabel }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ openctiRole: undefined }),
        expect.anything()
      );
    });
  });
});
