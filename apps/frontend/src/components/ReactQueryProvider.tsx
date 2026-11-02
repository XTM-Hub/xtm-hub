'use client';

import { getQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

interface ReactQueryProviderProps {
  children: ReactNode;
}

export const ReactQueryProvider = ({ children }: ReactQueryProviderProps) => {
  // Not in useState: React throws the state away if the first render
  // suspends with no boundary above, which would drop the browser client.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
