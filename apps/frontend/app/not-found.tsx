'use client';
import PublicPathError from '@/components/PublicPathError';
import { RelayProvider } from '@/relay/relay-provider';
import { usePathname } from 'next/navigation';
import '../styles/globals.css';

const NotFound = () => {
  const pathname = usePathname();
  return (
    <RelayProvider>
      <PublicPathError
        error={{
          name: 'PageNotFoundError',
          message: `An user try to reach this unknown path: ${pathname}`,
        }}
      />
    </RelayProvider>
  );
};

export default NotFound;
