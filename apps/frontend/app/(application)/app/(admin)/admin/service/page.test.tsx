import { redirect } from 'next/navigation';
import Page from './page';

describe('Admin Services page', () => {
  it('should redirect to the Services tab of the service catalog', () => {
    // Given / When
    Page();

    // Then
    expect(redirect).toHaveBeenCalledWith(
      '/app/admin/service-catalog?tab=services'
    );
  });
});
