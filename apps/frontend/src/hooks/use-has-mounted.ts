import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns true once the component has completed its first client-side
 * render, and false during SSR and the initial client render. Useful to
 * avoid hydration mismatches or a flash of incorrect content when a value
 * (e.g. from localStorage) is only known on the client.
 */
export const useHasMounted = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
