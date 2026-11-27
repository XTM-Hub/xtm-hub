'use client';
import PublicPathError from '@/components/PublicPathError';
import { usePathname } from 'next/navigation';

interface ErrorProps {
  error: Error & { digest?: string; componentStack?: string };
}

const Error = ({ error }: ErrorProps) => {
  const pathname = usePathname();
  return (
    <PublicPathError
      error={{
        ...error,
        message: `An user try to reach this unknown path: ${pathname}`,
      }}
    />
  );
};

export default Error;
