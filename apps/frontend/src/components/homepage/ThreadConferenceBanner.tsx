import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

const THREAD_CONFERENCE_URL = 'https://thread.filigran.io/';

const ThreadConferenceBanner = async () => {
  const t = await getTranslations('PublicHomePage.ThreadConference');

  return (
    <Link
      href={THREAD_CONFERENCE_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={t('Cta')}
      className="block w-full overflow-hidden rounded-md border border-cyan/60 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Image
        src="/thread-conference-banner.png"
        alt={t('ImageAlt')}
        width={865}
        height={120}
        sizes="100vw"
        className="aspect-[865/120] h-auto w-full object-contain object-center"
        priority
      />
    </Link>
  );
};

export default ThreadConferenceBanner;
