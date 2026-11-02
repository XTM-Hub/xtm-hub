import { ReachSalesButton } from '@/components/service/trial-instances/reach-sales/ReachSalesButton';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  DeploymentRequestDeploymentType,
  ReachSalesMutation,
  ReachSalesMutationVariables,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

const showSnackbarMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: showSnackbarMock,
}));

const GQL_OPERATION_REACH_SALES = 'ReachSales';
const MESSAGE = 'I would like to extend my trial';
const REACH_SALES_LABEL = 'Service.Trials.ReachOutToSales';
const SUCCESS_TITLE = 'Service.Trials.ReachOutToSalesSuccessTitle';
const SUCCESS_MESSAGE = 'Service.Trials.ReachOutToSalesSuccessMessage';

const mockReachSales = () => {
  const captured: { variables?: ReachSalesMutationVariables } = {};
  mswServer.use(
    graphql.mutation<ReachSalesMutation, ReachSalesMutationVariables>(
      GQL_OPERATION_REACH_SALES,
      ({ variables }) => {
        captured.variables = variables;
        return HttpResponse.json({
          data: { contactUs: { success: true } },
        });
      }
    )
  );
  return captured;
};

const renderAndSubmitReachSalesForm = async () => {
  const { user } = testRender(<ReachSalesButton variant="default" />);
  await user.click(screen.getByRole('button', { name: REACH_SALES_LABEL }));
  const dialog = await screen.findByRole('dialog');
  await user.type(within(dialog).getByRole('textbox'), MESSAGE);
  await user.click(
    within(dialog).getByRole('button', { name: REACH_SALES_LABEL })
  );
};

describe('ReachSalesButton', () => {
  it('should send the message as a bundle request when the form is submitted', async () => {
    // Given
    const captured = mockReachSales();

    // When
    await renderAndSubmitReachSalesForm();

    // Then
    await waitFor(() => {
      expect(captured.variables).toEqual({
        message: MESSAGE,
        deploymentRequestType: DeploymentRequestDeploymentType.Bundle,
      });
    });
  });

  it('should confirm with a success snackbar when the request is sent', async () => {
    // Given
    mockReachSales();

    // When
    await renderAndSubmitReachSalesForm();

    // Then
    await waitFor(() => {
      expect(showSnackbarMock).toHaveBeenCalledWith({
        severity: 'success',
        title: SUCCESS_TITLE,
        description: SUCCESS_MESSAGE,
      });
    });
  });

  it('should close the dialog when the request is sent', async () => {
    // Given
    mockReachSales();

    // When
    await renderAndSubmitReachSalesForm();

    // Then
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
