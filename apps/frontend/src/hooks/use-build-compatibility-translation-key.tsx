import { RegisteredPlatformsListItem } from '@/hooks/use-registered-platforms';
import { doesVersionSatisfy } from '@/utils/versioning';
import { useMemo } from 'react';

interface Props {
  platforms: RegisteredPlatformsListItem[];
  requiredProductVersion?: string | null;
}

export const useBuildCompatibilityTranslationKey = ({
  platforms,
  requiredProductVersion,
}: Props): {
  platformToBeUpdated: string;
  incompatiblePlatformsCount: number;
} => {
  const { platformToBeUpdated, incompatiblePlatformsCount } = useMemo(() => {
    if (!requiredProductVersion) {
      return {
        platformToBeUpdated: '',
        incompatiblePlatformsCount: 0,
      };
    }

    const incompatiblePlatforms = platforms.filter(
      (platform) =>
        !doesVersionSatisfy({
          givenVersion: platform.version ?? '0.0.0',
          requiredVersion: requiredProductVersion,
        })
    );

    const platformToBeUpdated = incompatiblePlatforms
      .map((platform) => platform.title)
      .join(', ');

    return {
      platformToBeUpdated,
      incompatiblePlatformsCount: incompatiblePlatforms.length,
    };
  }, [platforms, requiredProductVersion]);

  return { platformToBeUpdated, incompatiblePlatformsCount };
};
