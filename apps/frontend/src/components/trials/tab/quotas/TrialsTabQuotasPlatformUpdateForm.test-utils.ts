import {
  DeploymentRequestPlatformRegion,
  TrialsQuotaFragment,
} from '@graphql/generated';
import { mockDeploymentAvailability } from '@graphql/mocks';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import type { Mock } from 'vitest';

export const QUOTA_REGION = DeploymentRequestPlatformRegion.EuWest;
export const QUOTA_REGION_LABEL = 'Region.EU_WEST';
export const CURRENT_CAPACITY = 10;
export const NEW_CAPACITY = 25;
export const SERVER_ERROR = 'DEPLOYMENT_REQUEST_QUOTA_NOT_FOUND';
export const VALIDATE_LABEL = 'Utils.Validate';
export const CANCEL_LABEL = 'Utils.Cancel';
export const SHEET_TITLE = 'TrialsDashboard.UpdateQuotasForm.BundleTitle';
const CAPACITY_LABEL = 'TrialsDashboard.UpdateQuotasForm.NewCapacityLabel';

export const QUOTA: TrialsQuotaFragment = mockDeploymentAvailability({
  region: QUOTA_REGION,
  capacity: CURRENT_CAPACITY,
  availableCount: 4,
});

interface MutationCallbacks {
  onSuccess: () => Promise<void>;
  onError: (error: unknown) => void;
}

interface QuotaUpdateOutcome {
  error?: unknown;
  recordVariables?: (variables: unknown) => void;
}

export const mockQuotaUpdate = (
  useMutation: Mock,
  { error, recordVariables = () => undefined }: QuotaUpdateOutcome = {}
) =>
  useMutation.mockImplementation(
    (_client: unknown, callbacks: MutationCallbacks) => ({
      mutate: (variables: unknown) => {
        recordVariables(variables);
        void Promise.resolve().then(() =>
          error === undefined ? callbacks.onSuccess() : callbacks.onError(error)
        );
      },
    })
  );

export const getCapacityInput = () =>
  screen.getByRole('spinbutton', { name: CAPACITY_LABEL });

export const typeCapacity = async (user: UserEvent, capacity: string) => {
  await user.clear(getCapacityInput());
  await user.type(getCapacityInput(), capacity);
};

export const submitCapacity = async (user: UserEvent, capacity: number) => {
  await typeCapacity(user, String(capacity));
  await user.click(screen.getByRole('button', { name: VALIDATE_LABEL }));
  return screen.findByRole('alertdialog');
};

export const confirmCapacity = async (user: UserEvent, capacity: number) => {
  const confirmDialog = await submitCapacity(user, capacity);
  await user.click(
    within(confirmDialog).getByRole('button', { name: VALIDATE_LABEL })
  );
};
