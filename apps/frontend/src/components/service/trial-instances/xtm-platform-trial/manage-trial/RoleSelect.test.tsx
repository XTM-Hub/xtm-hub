import { NO_ROLE_VALUE } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/manage-trial.const';
import { RoleSelect } from '@/components/service/trial-instances/xtm-platform-trial/manage-trial/RoleSelect';
import testRender from '@/utils/test/test-render';
import { ServiceGroupName } from '@graphql/generated';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const roles = [
  ServiceGroupName.Admin,
  ServiceGroupName.Analyst,
  ServiceGroupName.Reader,
];
const namespace = 'Service.Bundle.ManageTrial.Roles.opencti';
const noAccessLabel = 'Service.Bundle.ManageTrial.Roles.NoAccess';
const roleLabel = 'Service.Bundle.ManageTrial.Roles.opencti.Title';

describe('RoleSelect', () => {
  it('should name the combobox with the label when a label is given', () => {
    // Given / When
    testRender(
      <RoleSelect
        value={ServiceGroupName.Reader}
        onValueChange={vi.fn()}
        roles={roles}
        namespace={namespace}
        isOptional={false}
        triggerClassName=""
        label={roleLabel}
      />
    );

    // Then
    expect(
      screen.getByRole('combobox', { name: roleLabel })
    ).toBeInTheDocument();
  });

  it('lists every provided role as a selectable option', async () => {
    const { user } = testRender(
      <RoleSelect
        value={ServiceGroupName.Reader}
        onValueChange={vi.fn()}
        roles={roles}
        namespace={namespace}
        isOptional={false}
        triggerClassName=""
        aria-label={roleLabel}
      />
    );

    await user.click(screen.getByRole('combobox', { name: roleLabel }));

    roles.forEach((role) => {
      expect(
        screen.getByRole('option', { name: `${namespace}.${role}.Label` })
      ).toBeInTheDocument();
    });
  });

  it('offers a "No access" option when the platform is optional', async () => {
    const { user } = testRender(
      <RoleSelect
        value=""
        onValueChange={vi.fn()}
        roles={roles}
        namespace={namespace}
        isOptional
        triggerClassName=""
        aria-label={roleLabel}
      />
    );

    await user.click(screen.getByRole('combobox', { name: roleLabel }));

    expect(
      screen.getByRole('option', { name: noAccessLabel })
    ).toBeInTheDocument();
  });

  it('does not offer a "No access" option when the platform is mandatory', async () => {
    const { user } = testRender(
      <RoleSelect
        value={ServiceGroupName.Admin}
        onValueChange={vi.fn()}
        roles={roles}
        namespace={namespace}
        isOptional={false}
        triggerClassName=""
        aria-label={roleLabel}
      />
    );

    await user.click(screen.getByRole('combobox', { name: roleLabel }));

    expect(
      screen.queryByRole('option', { name: noAccessLabel })
    ).not.toBeInTheDocument();
  });

  it('calls onValueChange with the selected role', async () => {
    const onValueChange = vi.fn();
    const { user } = testRender(
      <RoleSelect
        value=""
        onValueChange={onValueChange}
        roles={roles}
        namespace={namespace}
        isOptional={false}
        triggerClassName=""
        aria-label={roleLabel}
      />
    );

    await user.click(screen.getByRole('combobox', { name: roleLabel }));
    await user.click(
      screen.getByRole('option', { name: `${namespace}.Admin.Label` })
    );

    expect(onValueChange).toHaveBeenCalledWith(ServiceGroupName.Admin);
  });

  it('calls onValueChange with the "no role" sentinel when "No access" is selected', async () => {
    const onValueChange = vi.fn();
    const { user } = testRender(
      <RoleSelect
        value={ServiceGroupName.Admin}
        onValueChange={onValueChange}
        roles={roles}
        namespace={namespace}
        isOptional
        triggerClassName=""
        aria-label={roleLabel}
      />
    );

    await user.click(screen.getByRole('combobox', { name: roleLabel }));
    await user.click(screen.getByRole('option', { name: noAccessLabel }));

    expect(onValueChange).toHaveBeenCalledWith(NO_ROLE_VALUE);
  });
});
