import { useTranslate } from '@/hooks/use-translate';
import { SHAREABLE_RESOURCE_TYPE_NAME_MAPPING } from '@/utils/shareable-resources/shareable-resources.types';
import { Button, DialogTitle } from '@filigran/design-system';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { DocumentItemFragment } from '@graphql/generated';

interface OnePlatformDisplayProps {
  documentData: DocumentItemFragment;
  platforms: useRegisteredPlatformsFragment$data[];
  setIsOpen: (isOpen: boolean) => void;
  oneClickDeploy: (url: string) => void;
}

const OnePlatformDisplay = ({
  documentData,
  platforms,
  setIsOpen,
  oneClickDeploy,
}: OnePlatformDisplayProps) => {
  const t = useTranslate();

  return (
    <>
      <div className="space-y-3">
        <DialogTitle>
          {t('Service.ShareableResources.Deploy.DeployResourceDescription', {
            resourceName: documentData.name ?? '',
            resourceType:
              SHAREABLE_RESOURCE_TYPE_NAME_MAPPING[
                documentData.type as keyof typeof SHAREABLE_RESOURCE_TYPE_NAME_MAPPING
              ],
          })}
        </DialogTitle>
        <p>
          {t('Service.ShareableResources.Deploy.DeployDescriptionOnePlatform', {
            platformName: platforms[0]?.title ?? 'OpenCTI',
          })}
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          priority="secondary"
          type="button"
          onClick={() => {
            setIsOpen(false);
          }}>
          {t('Utils.Cancel')}
        </Button>

        <Button
          onClick={() => {
            setIsOpen(false);
            oneClickDeploy(platforms[0]?.url ?? '');
          }}>
          {t('Utils.Continue')}
        </Button>
      </div>
    </>
  );
};

export default OnePlatformDisplay;
