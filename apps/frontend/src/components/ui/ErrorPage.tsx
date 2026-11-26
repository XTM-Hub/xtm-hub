'use client';
import { DisplayLogo } from '@/components/ui/DisplayLogo';
import { ReactNode } from 'react';

interface ErrorPageProps {
  children: ReactNode;
}
export const ErrorPage = ({ children }: ErrorPageProps) => {
  return (
    <main className="absolute inset-0 z-0 m-auto flex flex-col justify-center items-center px-4 bg-gradient-default">
      <div className="max-w-[450px] w-full">
        <DisplayLogo />
      </div>
      <div className="layer-1 bg-elevation-default rounded w-full p-4 mb-4 mt-6 max-w-[650px]">
        {children}
      </div>
    </main>
  );
};
