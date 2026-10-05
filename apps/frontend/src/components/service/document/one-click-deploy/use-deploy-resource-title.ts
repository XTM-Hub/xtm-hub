import { useTranslate } from '@/hooks/use-translate';
import {
  SHAREABLE_RESOURCE_TYPE_NAME_MAPPING,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';

export const useDeployResourceTitle = (
  documentData: documentItem_fragment$data
): string => {
  const t = useTranslate();
  const resourceName = documentData.name ?? '';
  if (documentData.type === ShareableResourceType.OPENCTI_HUNT_PACK) {
    return t('Service.ShareableResources.Deploy.DeployHuntPackDescription', {
      resourceName,
    });
  }
  return t('Service.ShareableResources.Deploy.DeployResourceDescription', {
    resourceName,
    resourceType:
      SHAREABLE_RESOURCE_TYPE_NAME_MAPPING[
        documentData.type as keyof typeof SHAREABLE_RESOURCE_TYPE_NAME_MAPPING
      ],
  });
};
