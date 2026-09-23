import { appendContentKeyMarker } from '@/utils/content-translation/invisible-marker';

// Wraps a next-intl translator so every plain string returned by t(key) ends
// with an invisible marker encoding its fully-qualified content key, which
// EditModeContentObserver detects in the DOM. Only the callable form is
// marked: t.rich/t.markup return JSX and t.raw/t.has are not rendered text,
// so they pass through the Proxy's default `get` trap untouched.
export const withContentKeyMarkers = <Translator extends CallableFunction>(
  t: Translator,
  namespace?: string
): Translator =>
  new Proxy(t, {
    apply(target, thisArg, args: unknown[]) {
      const result: unknown = Reflect.apply(target, thisArg, args);
      if (typeof result !== 'string') {
        return result;
      }
      const key = String(args[0]);
      return appendContentKeyMarker(
        result,
        namespace ? `${namespace}.${key}` : key
      );
    },
  });
