'use client';
import { type ReactNode, useState } from 'react';

const PageContainer = ({
  children,
}: {
  children: (ref?: HTMLDivElement | null) => ReactNode;
}) => {
  const [ref, setRef] = useState<HTMLDivElement | null>();
  return (
    <div
      className="flex flex-col gap-s sm:gap-l h-full"
      ref={setRef}>
      {children(ref)}
    </div>
  );
};

export { PageContainer };
