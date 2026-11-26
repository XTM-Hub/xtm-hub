import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import useExternalTab from '@/hooks/use-external-tab';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import { OPENCTI_INTEGRATION_URL_CONFIGS } from '@/utils/shareable-resources/shareable-resources.consts';
import {
  isConnectorResource,
  ShareableResourceType,
} from '@/utils/shareable-resources/shareable-resources.types';
import {
  docHasMetadata,
  getDocumentEntityTypes,
} from '@/utils/shareable-resources/utils/shareable-resources.client.utils';
import {
  DocumentItemFragment,
  useRefreshUserPlatformTokenMutation,
} from '@graphql/generated';

const OPENCTI_URL_CONFIGS = {
  opencti_custom_dashboard: 'deploy-custom-dashboard',
  opencti_custom_view: 'deploy-custom-view',
  opencti_integration: 'deploy-csv-feed',
  opencti_playbook: 'deploy-playbook',
};

interface Props {
  platformBasePath: string;
  documentData: DocumentItemFragment;
}

interface Return {
  openTab: () => void;
}

function computeDeployUrl(
  documentData: DocumentItemFragment,
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
    const entityTypes = getDocumentEntityTypes(documentData) ?? [];
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
  const t = useTranslate();
  const { mutate: refreshUserPlatformToken } =
    useRefreshUserPlatformTokenMutation(portalGraphqlClient, {
      scope: {
        id: useRefreshUserPlatformTokenMutation.getRootKey()[0],
      },
      // Hook-level, unlike the per-call callbacks that only the latest call of a mounted component runs: every
      // rotated token reaches the tab, even when a later refresh fails or the page unmounts before the answer.
      // postToTab is declared below: the tab's message handler needs this mutation, so one of the two must come
      // first; this callback only runs after render.
      onSuccess: (response) => {
        postToTab({
          action: 'set-token',
          token: response.refreshUserPlatformToken.token,
        });
      },
    });

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.action === 'refresh-token') {
      refreshUserPlatformToken(
        {},
        {
          onError: (error) => {
            const errorMessage =
              error instanceof Error ? error.message : 'UNKNOWN_ERROR';
            showSnackbar({
              severity: 'error',
              title: t('Utils.Error'),
              description: <>{t(`Error.Server.${errorMessage}`)}</>,
            });
          },
        }
      );
    }
  };
  const url = computeDeployUrl(documentData, platformBasePath);
  const { openTab, postMessage: postToTab } = useExternalTab({
    url,
    tabName:
      documentData.type === ShareableResourceType.OPENAEV_SCENARIO
        ? 'openaev-one-click-deploy'
        : 'opencti-one-click-deploy',
    onMessage: handleMessage,
    preventUnload: false,
  });

  return {
    openTab,
  };
};
