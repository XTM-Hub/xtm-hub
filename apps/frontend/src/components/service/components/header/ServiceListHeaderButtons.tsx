import { PortalContext } from '@/components/me/AppPortalContext';
import { ServiceListIntegrationDropdown } from '@/components/service/components/header/ServiceListIntegrationDropdown';
import { useServiceContext } from '@/components/service/components/ServiceContext';
import { ServiceManageSheet } from '@/components/service/components/ServiceManageSheet';
import { useAdminByPass } from '@/hooks/use-portal-capability';
import useServiceCapability, {
  useServiceCapabilityWithSubscriptionId,
} from '@/hooks/use-service-capability';
import { APP_PATH } from '@/utils/path/constant';
import { ShareableResourceType } from '@/utils/shareable-resources/shareable-resources.types';
import { Button } from '@filigran/ui';
import { OrganizationCapability, ServiceRestriction } from '@graphql/generated';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useContext, useState } from 'react';

const ServiceListHeaderButtons = ({}) => {
  const t = useTranslations();
  const { hasOrganizationCapability } = useContext(PortalContext);

  const { serviceInstance, translationKey, type, setIntegrationType } =
    useServiceContext();
  const [openSheet, setOpenSheet] = useState(false);
  const isBypass = useAdminByPass();

  const { hasCapability: hasCapaManageAccess, subscriptionId } =
    useServiceCapabilityWithSubscriptionId(
      ServiceRestriction.ManageAccess,
      serviceInstance
    );

  const isAdminOrga =
    hasOrganizationCapability &&
    (hasOrganizationCapability(
      OrganizationCapability.AdministrateOrganization
    ) ||
      hasOrganizationCapability(OrganizationCapability.ManageSubscription));

  const userCanUpdate = useServiceCapability(
    ServiceRestriction.Upload,
    serviceInstance
  );
  const isIntegration = type === ShareableResourceType.OPENCTI_INTEGRATION;

  return (
    <div className="flex gap-s">
      {(hasCapaManageAccess || isAdminOrga || isBypass) && subscriptionId && (
        <Button
          variant="secondary"
          asChild>
          <Link
            prefetch={false}
            href={`/${APP_PATH}/manage/service/${serviceInstance.id}/subscription/${subscriptionId}`}>
            {t('Service.Capabilities.ManageAccessName')}
          </Link>
        </Button>
      )}
      {userCanUpdate && (
        <>
          {isIntegration ? (
            <ServiceListIntegrationDropdown
              onIntegrationTypeSelect={(integrationType) => {
                setIntegrationType(integrationType);
                setOpenSheet(true);
              }}
            />
          ) : (
            <Button onClick={() => setOpenSheet(true)}>
              {t(`${translationKey}.AddService`)}
            </Button>
          )}
          <ServiceManageSheet
            open={openSheet}
            setOpen={setOpenSheet}
          />
        </>
      )}
    </div>
  );
};

export default ServiceListHeaderButtons;
