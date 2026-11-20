import { fetchServiceInstanceById } from '@/components/service/service-instance.server';
import testRender from '@/utils/test/test-render';
import {
  ServiceDefinitionIdentifier,
  type ServiceInstanceItemFragment,
} from '@graphql/generated';
import { screen } from '@testing-library/react';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

vi.mock('@/components/service/service-instance.server', () => ({
  fetchServiceInstanceById: vi.fn(),
}));

// The epics prefetch reaches the API: it is not under test.
vi.mock('@/components/epic/PrefetchedEpicList', () => ({
  prefetchEpicList: vi.fn(async () => ({ mutations: [], queries: [] })),
  PrefetchedEpicList: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./page-loader', () => ({
  default: ({
    serviceInstance,
  }: {
    serviceInstance: ServiceInstanceItemFragment;
  }) => <div>roadmap-{serviceInstance.name}</div>,
}));

const NOT_FOUND_ERROR = new Error('NEXT_NOT_FOUND');
const SERVICE_NAME = 'XTM roadmap';
const SERVICE_INSTANCE: ServiceInstanceItemFragment = {
  id: 'roadmap 1',
  name: SERVICE_NAME,
  description: null,
  slug: null,
  capabilities: [],
  service_definition: {
    identifier: ServiceDefinitionIdentifier.XtmPlatformRoadmap,
  },
};

const renderPage = async () =>
  testRender(
    await Page({
      params: Promise.resolve({ serviceInstanceId: 'roadmap%201' }),
    })
  );

describe('XTM platform roadmap page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the roadmap of the decoded service instance', async () => {
    // Given
    vi.mocked(fetchServiceInstanceById).mockResolvedValue(SERVICE_INSTANCE);

    // When
    await renderPage();

    // Then
    expect(fetchServiceInstanceById).toHaveBeenCalledWith('roadmap 1');
    expect(
      await screen.findByText(`roadmap-${SERVICE_NAME}`)
    ).toBeInTheDocument();
  });

  it('should lead to the not found page when the service instance cannot be read', async () => {
    // Given
    vi.mocked(fetchServiceInstanceById).mockResolvedValue(null);
    // Next.js' notFound never returns: it throws to interrupt the render.
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw NOT_FOUND_ERROR;
    });

    // When
    const result = renderPage();

    // Then
    await expect(result).rejects.toBe(NOT_FOUND_ERROR);
  });
});
