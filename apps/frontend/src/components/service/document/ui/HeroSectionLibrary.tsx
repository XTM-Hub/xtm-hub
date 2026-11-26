import { localizedCardDescription, localizedCardName } from '@/utils/services';
import { LibraryUpdateMetadata } from './LibraryUpdateMetadata';

export const heroSectionLibraryTranslationKeys = {
  eyebrow: 'Service.LibraryHero.Eyebrow',
} as const;

interface HeroSectionLibraryServiceInstance {
  slug?: string | null;
  name: string;
  description?: string | null;
}

export interface HeroSectionLibraryProps {
  name: string;
  eyebrow: string;
  description: string;
  showLibraryUpdate?: boolean;
}

type HeroSectionLibraryTranslator = Parameters<typeof localizedCardName>[1];

export const getHeroSectionLibraryProps = (
  serviceInstance: HeroSectionLibraryServiceInstance,
  t: HeroSectionLibraryTranslator
): HeroSectionLibraryProps => {
  return {
    name: localizedCardName(serviceInstance, t),
    eyebrow: t(heroSectionLibraryTranslationKeys.eyebrow),
    description: localizedCardDescription(serviceInstance, t),
  };
};

export const HeroSectionLibrary = ({
  name,
  eyebrow,
  description,
  showLibraryUpdate = false,
}: HeroSectionLibraryProps) => {
  return (
    <section className="pt-3 pb-8">
      <div className="flex flex-col gap-2">
        <p className="text-filigran-brand-primary font-bold">{eyebrow}</p>
        <div className="flex flex-row items-center">
          <h1 className="title-2xl">{name}</h1>
          {showLibraryUpdate && (
            <div className="flex items-center">
              <LibraryUpdateMetadata />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <p className="max-w-lg content-compact">{description}</p>
        </div>
      </div>
    </section>
  );
};
