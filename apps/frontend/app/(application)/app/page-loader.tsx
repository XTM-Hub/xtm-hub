'use client';

import { MeQuery } from '@/components/me/me.graphql';
import Context from '@/components/me/MeContext';
import SettingsContext from '@/components/settings/SettingsContext';
import useMountingLoader from '@/hooks/use-mounting-loader';
import { meLoaderQuery } from '@generated/meLoaderQuery.graphql';
import * as React from 'react';
import { useQueryLoader } from 'react-relay';

// Component interface
interface LayoutPreloaderProps {
  children: React.ReactNode;
}

// Component
const PageLoader = ({ children }: LayoutPreloaderProps) => {
  const [queryRef, loadQuery] = useQueryLoader<meLoaderQuery>(MeQuery);
  useMountingLoader(loadQuery, {});
  return (
    <SettingsContext>
      {queryRef && <Context queryRef={queryRef}>{children}</Context>}
    </SettingsContext>
  );
};

// Component export
export default PageLoader;
