import { RefreshUserPlatformTokenMutation } from '@/components/registration/register/register.graphql';
import useExternalTab from '@/hooks/use-external-tab';
import { OPENCTI_INTEGRATION_URL_CONFIGS } from '@/utils/shareable-resources/shareable-resources.consts';
import {
  isConnectorResource,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import { docHasMetadata } from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import { toast } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import {
  registerRefreshUserPlatformTokenMutation,
  registerRefreshUserPlatformTokenMutation$data,
} from '@generated/registerRefreshUserPlatformTokenMutation.graphql';
import { useTranslations } from 'next-intl';
import { useMutation } from 'react-relay';

const OPENCTI_URL_CONFIGS = {
  opencti_custom_dashboard: 'deploy-custom-dashboard',
  opencti_custom_view: 'deploy-custom-view',
  opencti_integration: 'deploy-csv-feed',
  opencti_playbook: 'deploy-playbook',
};

interface Props {
  platformBasePath: string;
  documentData: documentItem_fragment$data;
}

interface Return {
  openTab: () => void;
}

function computeDeployUrl(
  documentData: documentItem_fragment$data,
  platformBasePath: string
): string {
  const { id, service_instance, type } = documentData;

  if (type === ShareableResourceType.OPENAEV_SCENARIO) {
    return `${platformBasePath}/admin/deploy-scenario/${service_instance?.id}/${id}`;
  }

  if (isConnectorResource(documentData)) {
    return `${platformBasePath}/dashboard/xtm-hub/deploy-connector/${documentData.slug}?openConfig=true`;
  }

  if (
    docHasMetadata(documentData, 'integration_type') &&
    documentData.integration_type
  ) {
    const urlIntegrationKey =
      OPENCTI_INTEGRATION_URL_CONFIGS[documentData.integration_type];
    return `${platformBasePath}/dashboard/xtm-hub/${urlIntegrationKey}/${service_instance?.id}/${id}`;
  }

  const urlKey = OPENCTI_URL_CONFIGS[type as keyof typeof OPENCTI_URL_CONFIGS];
  const baseUrl = `${platformBasePath}/dashboard/xtm-hub/${urlKey}/${service_instance?.id}/${id}`;

  if (type === ShareableResourceType.OPENCTI_CUSTOM_VIEW) {
    const entityTypes = documentData.entity_types ?? [];
    if (entityTypes.length > 0) {
      const queryString = entityTypes
        .map(
          (entityType) => `targetEntityType=${encodeURIComponent(entityType)}`
        )
        .join('&');
      return `${baseUrl}?${queryString}`;
    }
  }

  return baseUrl;
}

export const useOneClickDeployTab = ({
  platformBasePath,
  documentData,
}: Props): Return => {
  const t = useTranslations();
  const [refreshUserPlatformToken] =
    useMutation<registerRefreshUserPlatformTokenMutation>(
      RefreshUserPlatformTokenMutation
    );

  const handleMessage = (event: MessageEvent) => {
    const eventData = event.data;
    const { action } = eventData;
    if (action === 'refresh-token') {
      refreshUserPlatformToken({
        variables: {},
        onCompleted,
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: t('Utils.Error'),
            description: <>{t(`Error.Server.${error.message}`)}</>,
          });
        },
      });
    }
  };
  const url = computeDeployUrl(documentData, platformBasePath);
  const { openTab, postMessage } = useExternalTab({
    url,
    tabName:
      documentData.type === ShareableResourceType.OPENAEV_SCENARIO
        ? 'openaev-one-click-deploy'
        : 'opencti-one-click-deploy',
    onMessage: handleMessage,
    preventUnload: false,
  });

  const onCompleted = (
    response: registerRefreshUserPlatformTokenMutation$data
  ) => {
    postMessage({
      action: 'set-token',
      token: response.refreshUserPlatformToken.token,
    });
  };

  return {
    openTab,
  };
};
