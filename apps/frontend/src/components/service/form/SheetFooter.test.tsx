import { AppServiceContext } from '@/components/service/components/ServiceContext';
import {
  buildServiceContext,
  VALIDATE_LABEL,
} from '@/components/service/form/ServiceForm.test-utils';
import { ServiceFormSheetFooter } from '@/components/service/form/SheetFooter';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('ServiceFormSheetFooter', () => {
  it('should disable the validate button while the service mutation is in flight', () => {
    // Given a service context with a mutation in flight
    const context = buildServiceContext({ isSubmitting: true });

    // When the footer renders
    testRender(
      <AppServiceContext {...context}>
        <ServiceFormSheetFooter handleCloseSheet={vi.fn()} />
      </AppServiceContext>
    );

    // Then the form cannot be submitted again
    expect(
      screen.getByRole('button', { name: new RegExp(`^${VALIDATE_LABEL}`) })
    ).toBeDisabled();
  });

  it('should keep the validate button enabled when no service mutation is in flight', () => {
    // Given a service context without a mutation in flight
    const context = buildServiceContext({ isSubmitting: false });

    // When the footer renders
    testRender(
      <AppServiceContext {...context}>
        <ServiceFormSheetFooter handleCloseSheet={vi.fn()} />
      </AppServiceContext>
    );

    // Then the form can be submitted
    expect(screen.getByRole('button', { name: VALIDATE_LABEL })).toBeEnabled();
  });
});
