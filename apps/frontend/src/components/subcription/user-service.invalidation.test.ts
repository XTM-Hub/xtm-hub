import { invalidateUserServiceQueries } from '@/components/subcription/user-service.invalidation';
import { serviceUserCapabilitiesKeys } from '@graphql/service-instances/service-instances.keys';
import { userServicesKeys } from '@graphql/user-service/user-service.keys';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

describe('invalidateUserServiceQueries', () => {
  it.each`
    key                                  | description
    ${userServicesKeys.all()}            | ${'the users of a subscription'}
    ${serviceUserCapabilitiesKeys.all()} | ${'the capabilities of the user on a service'}
  `('should invalidate $description', async ({ key }) => {
    // Given
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, 'invalidateQueries')
      .mockResolvedValue();

    // When
    await invalidateUserServiceQueries(queryClient);

    // Then
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: key });
  });
});
