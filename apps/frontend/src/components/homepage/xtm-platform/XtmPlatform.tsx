import { ConnectProductButton } from '@/components/connected-products/ConnectProductButton';
import { getTranslate } from '@/hooks/get-translate';
import XtmPlatformImage from './XtmPlatformImage';

type XtmPlatformProps = {
  welcomeName?: string;
};

const XtmPlatform = async ({ welcomeName }: XtmPlatformProps = {}) => {
  const t = await getTranslate('PublicHomePage.XtmPlatform');
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="flex flex-col gap-4">
        <span className="text-filigran-brand-primary title-sm font-semibold tracking-wide">
          {welcomeName ? t('LabelWithName', { name: welcomeName }) : t('Label')}
        </span>
        <h1 className="title-2xl">{t('Title')}</h1>
        <p className="text-default-secondary text-xs max-w-110">
          {t('Description')}
        </p>
        <div className="w-53 flex items-center justify-between gap-2">
          <ConnectProductButton />
        </div>
      </div>

      <div className="rounded overflow-hidden flex items-center justify-end order-first md:order-last">
        <XtmPlatformImage />
      </div>
    </section>
  );
};

export default XtmPlatform;
