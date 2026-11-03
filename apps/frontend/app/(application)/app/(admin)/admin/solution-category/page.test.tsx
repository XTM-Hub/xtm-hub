import { redirect } from 'next/navigation';
import Page from './page';

describe('Admin solution categories page', () => {
  it('should redirect to the solution categories tab of the service catalog', () => {
    // Given / When
    Page();

    // Then
    expect(redirect).toHaveBeenCalledWith(
      '/app/admin/service-catalog?tab=solution-categories'
    );
  });
});
