import XtmRoadmap from '@/components/homepage/roadmap/XtmRoadmap';
import { PlatformIdentifier } from '@graphql/generated';

const PRIVATE_ROADMAP_BASE_PATH = '/app/service/xtm_platform_roadmap';

type PrivateHomepageRoadmapSectionProps = {
  platformIdentifiers: PlatformIdentifier[];
  serviceInstanceId: string | undefined;
};

const PrivateHomepageRoadmapSection = ({
  platformIdentifiers,
  serviceInstanceId,
}: PrivateHomepageRoadmapSectionProps) => {
  if (!serviceInstanceId) {
    return null;
  }

  const homepageRoadmapTitleProduct =
    platformIdentifiers.length === 1
      ? (platformIdentifiers?.[0] ?? 'default')
      : 'default';

  const roadmapHref = `${PRIVATE_ROADMAP_BASE_PATH}/${encodeURIComponent(serviceInstanceId)}`;
  const seeMoreHref =
    homepageRoadmapTitleProduct !== 'default'
      ? `${roadmapHref}?products=${encodeURIComponent(homepageRoadmapTitleProduct)}`
      : roadmapHref;

  return (
    <XtmRoadmap
      seeMoreHref={seeMoreHref}
      titleProduct={homepageRoadmapTitleProduct}
    />
  );
};

export default PrivateHomepageRoadmapSection;
