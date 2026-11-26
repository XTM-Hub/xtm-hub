import { redirect } from 'next/navigation';
import Page from './page';

describe('Admin use cases page', () => {
  it('should redirect to the use cases tab of the service catalog', () => {
    // Given / When
    Page();

    // Then
    expect(redirect).toHaveBeenCalledWith(
      '/app/admin/service-catalog?tab=use-cases'
    );
  });
});
