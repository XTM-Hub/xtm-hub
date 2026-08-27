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
      className="block overflow-hidden rounded-md border border-cyan/60 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Image
        src="/thread-conference-banner.png"
        alt={t('ImageAlt')}
        width={865}
        height={120}
        sizes="(max-width: 768px) 100vw, 865px"
        className="h-auto w-full"
        priority
      />
    </Link>
  );
};

export default ThreadConferenceBanner;
