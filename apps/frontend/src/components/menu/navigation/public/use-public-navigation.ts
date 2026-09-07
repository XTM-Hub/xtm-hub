import {
  BottomLink,
  NavigationConfig,
  SectionConfig,
  SectionLink,
} from '@/components/menu/navigation/shared/navigation.type';
import {
  PUBLIC_CYBERSECURITY_SOLUTIONS_PATH,
  XTM_PLATFORM_ROADMAP_SLUG,
} from '@/utils/path/constant';
import { ServiceSlug } from '@/utils/shareable-resources/shareable-resources.types';
import {
  DiamondOutlinedIcon,
  HomeIcon,
  LogoXtmOneIcon,
  OpenAevIconIcon,
  OpenCtiIconIcon,
  PapermapIcon,
  PostIcon,
  SchoolIcon,
  SlackIcon,
} from '@filigran/icon';
import { useLocale, useTranslations } from 'next-intl';

export const usePublicNavigation = (
  visibleServiceSlugs: string[],
  isXtmPlatformTrialEnabled: boolean
): NavigationConfig => {
  const t = useTranslations();
  const locale = useLocale();
  const visibleSlugs = new Set(visibleServiceSlugs);
  const xtmPlatformTrialPublicHref = `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/xtm-platform-trial`;

  const buildServiceLink = (slug: string, label: string): SectionLink[] => {
    if (!visibleSlugs.has(slug)) {
      return [];
    }
    return [
      {
        href: `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${slug}`,
        label,
      },
    ];
  };

  const sections: SectionConfig[] = [
    {
      key: 'xtm-platform',
      label: t('Menu.XTMPlatform'),
      icon: HomeIcon,
      pathPrefix: `/${locale}`,
      href: `/${locale}`,
      links: [],
    },
    {
      key: 'opencti',
      label: 'OpenCTI',
      icon: OpenCtiIconIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/opencti`,
      links: [
        ...(!isXtmPlatformTrialEnabled
          ? [
              {
                href: `/${locale}/cybersecurity-solutions/opencti-free-trial`,
                label: t('Menu.StartFreeTrial'),
                highlight: true,
              },
            ]
          : []),
        ...buildServiceLink(
          ServiceSlug.OPEN_CTI_CUSTOM_DASHBOARDS,
          t('Menu.CustomDashboards')
        ),
        ...buildServiceLink(
          ServiceSlug.OPEN_CTI_CUSTOM_VIEWS,
          t('Menu.CustomViews')
        ),
        ...buildServiceLink(
          ServiceSlug.OPEN_CTI_INTEGRATIONS,
          t('Menu.Integrations')
        ),
        ...buildServiceLink(
          ServiceSlug.OPEN_CTI_PLAYBOOKS,
          t('Menu.Playbooks')
        ),
        {
          href: 'https://demo.opencti.io',
          label: t('Menu.LiveDemo'),
          external: true,
        },
        {
          href: 'https://docs.opencti.io/latest/',
          label: t('Menu.Documentation'),
          external: true,
        },
      ],
    },
    {
      key: 'openaev',
      label: 'OpenAEV',
      icon: OpenAevIconIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/openaev`,
      links: [
        ...(!isXtmPlatformTrialEnabled
          ? [
              {
                href: `/${locale}/cybersecurity-solutions/openaev-free-trial`,
                label: t('Menu.StartFreeTrial'),
                highlight: true,
              },
            ]
          : []),
        ...buildServiceLink(
          ServiceSlug.OPEN_AEV_SCENARIOS,
          t('Menu.Scenarios')
        ),
        {
          href: 'https://demo.openaev.io',
          label: t('Menu.LiveDemo'),
          external: true,
        },
        {
          href: 'https://docs.openaev.io/latest',
          label: t('Menu.Documentation'),
          external: true,
        },
      ],
    },
    {
      key: 'xtm-one',
      label: 'XTM One',
      icon: LogoXtmOneIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/xtm-one`,
      links: [
        {
          href: 'https://filigran.io/platform/xtm-one/',
          label: t('Menu.About'),
          external: true,
        },
        { label: t('Menu.AICatalog'), badge: t('Menu.ComingSoon') },
      ],
    },
  ];

  const bottomLinks: BottomLink[] = [
    ...(visibleSlugs.has(XTM_PLATFORM_ROADMAP_SLUG)
      ? [
          {
            key: 'xtm-platform-roadmap',
            href: `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${XTM_PLATFORM_ROADMAP_SLUG}`,
            icon: PapermapIcon,
            label: t('Menu.XTMRoadmap'),
          },
        ]
      : []),
    {
      key: 'filigran-academy',
      href: 'https://academy.filigran.io/',
      icon: SchoolIcon,
      label: t('Menu.FiligranAcademy'),
      external: true,
    },
    {
      key: 'filigran-blog',
      href: 'https://filigran.io/our-blog/',
      icon: PostIcon,
      label: t('Menu.Blog'),
      external: true,
    },
    {
      key: 'slack',
      href: 'https://filigran-community.slack.com',
      icon: SlackIcon,
      label: t('Menu.Slack'),
      external: true,
    },
    ...(isXtmPlatformTrialEnabled
      ? [
          {
            key: 'xtm-platform-trial',
            href: xtmPlatformTrialPublicHref,
            icon: DiamondOutlinedIcon,
            label: t('Menu.XTMPlatformTrial'),
            highlight: true,
          },
        ]
      : []),
  ];

  return { sections, bottomLinks };
};
