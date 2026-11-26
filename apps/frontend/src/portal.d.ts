interface Window {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
  [gaDisableKey: `ga-disable-${string}`]: boolean | undefined;
}
