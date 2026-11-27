'use client';
import PublicPathError from '@/components/PublicPathError';
import { usePathname } from 'next/navigation';
import '../styles/globals.css';

const NotFound = () => {
  const pathname = usePathname();
  return (
    <PublicPathError
      error={{
        name: 'PageNotFoundError',
        message: `An user try to reach this unknown path: ${pathname}`,
      }}
    />
  );
};

export default NotFound;
