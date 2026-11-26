import { appendContentKeyMarker } from '@/utils/content-translation/invisible-marker';

// Only the callable form is marked: t.rich/t.markup return JSX and t.raw/t.has
// are not rendered text.
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
