import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import { UnauthenticatedError } from '@/lib/graphql-fetch.utils';
import { buildSignupRedirect } from '@/utils/redirect';
import {
  ServiceDefinitionIdentifier,
  ServiceInstanceByIdDocument,
  type ServiceInstanceItemFragment,
} from '@graphql/generated';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock('@/lib/graphql-client', () => ({
  getAuthenticatedGraphqlClient: vi.fn(async () => ({ request })),
}));

const SERVICE_INSTANCE_ID = 'service-instance-1';
const SERVICE_PATHNAME = `/app/service/opencti_playbooks/${SERVICE_INSTANCE_ID}`;
const REDIRECT_SENTINEL = new Error('NEXT_REDIRECT');

const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: SERVICE_INSTANCE_ID,
  name: 'Playbooks',
  description: null,
  slug: 'opencti-playbooks',
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.OpenctiPlaybooks,
  },
};

describe('fetchServiceInstanceById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { case: 'the service instance', serviceInstanceById: SERVICE_INSTANCE },
    { case: 'null when it is not found', serviceInstanceById: null },
  ])('should return $case', async ({ serviceInstanceById }) => {
    // Given
    request.mockResolvedValue({ serviceInstanceById });

    // When
    const result = await fetchServiceInstanceById(SERVICE_INSTANCE_ID);

    // Then
    expect(result).toEqual(serviceInstanceById);
  });

  it.each([
    { case: 'does not exist', code: 'SERVICE_INSTANCE_NOT_FOUND' },
    {
      case: 'is not visible to the visitor',
      code: 'SERVICE_INSTANCE_NOT_PUBLIC',
    },
    {
      case: 'is hidden or missing for the access guards',
      code: 'NOT_FOUND',
    },
  ])('should return null when the service instance $case', async ({ code }) => {
    // Given
    request.mockRejectedValue(new Error(code));

    // When
    const result = await fetchServiceInstanceById(SERVICE_INSTANCE_ID);

    // Then
    expect(result).toBeNull();
  });

  it('should rethrow an unexpected failure', async () => {
    // Given
    const failure = new Error('INTERNAL_SERVER_ERROR');
    request.mockRejectedValue(failure);

    // When
    const result = fetchServiceInstanceById(SERVICE_INSTANCE_ID);

    // Then
    await expect(result).rejects.toBe(failure);
  });

  it('should read the service instance of the given id', async () => {
    // Given
    request.mockResolvedValue({ serviceInstanceById: SERVICE_INSTANCE });

    // When
    await fetchServiceInstanceById(SERVICE_INSTANCE_ID);

    // Then
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        document: ServiceInstanceByIdDocument,
        variables: { service_instance_id: SERVICE_INSTANCE_ID },
      })
    );
  });

  it('should redirect to the signup page when the visitor is not authenticated', async () => {
    // Given
    request.mockRejectedValue(new UnauthenticatedError());
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-pathname': SERVICE_PATHNAME })
    );
    // Next.js' redirect never returns: it throws to interrupt the request.
    vi.mocked(redirect).mockImplementationOnce(() => {
      throw REDIRECT_SENTINEL;
    });

    // When
    const result = fetchServiceInstanceById(SERVICE_INSTANCE_ID);

    // Then
    await expect(result).rejects.toBe(REDIRECT_SENTINEL);
    expect(redirect).toHaveBeenCalledWith(
      buildSignupRedirect(SERVICE_PATHNAME)
    );
  });
});
