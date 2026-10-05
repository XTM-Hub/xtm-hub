import { useTranslate } from '@/hooks/use-translate';
import { SHAREABLE_RESOURCE_TYPE_NAME_MAPPING } from '@/utils/shareable-resources/shareable-resources.types';
import { AlertDialogTitle } from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';

interface OnePlatformDisplayProps {
  documentData: documentItem_fragment$data;
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
      <div className="space-y-m">
        <AlertDialogTitle>
          {t('Service.ShareableResources.Deploy.DeployResourceDescription', {
            resourceName: documentData.name ?? '',
            resourceType:
              SHAREABLE_RESOURCE_TYPE_NAME_MAPPING[
                documentData.type as keyof typeof SHAREABLE_RESOURCE_TYPE_NAME_MAPPING
              ],
          })}
        </AlertDialogTitle>
        <p>
          {t('Service.ShareableResources.Deploy.DeployDescriptionOnePlatform', {
            platformName: platforms[0]?.title ?? 'OpenCTI',
          })}
        </p>
      </div>
      <div className="flex justify-end gap-s">
        <Button
          variant="secondary"
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
