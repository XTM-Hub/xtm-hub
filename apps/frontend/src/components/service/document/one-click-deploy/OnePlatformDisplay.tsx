import { useDeployResourceTitle } from '@/components/service/document/one-click-deploy/use-deploy-resource-title';
import { AlertDialogTitle } from '@filigran/ui';
import { Button } from '@filigran/ui/servers';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const title = useDeployResourceTitle(documentData);

  return (
    <>
      <div className="space-y-m">
        <AlertDialogTitle>{title}</AlertDialogTitle>
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
