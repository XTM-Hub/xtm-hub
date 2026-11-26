import {
  FILIGRAN_BLOG_URL,
  OPENCRQ_ABOUT_URL,
  XTM_ONE_ABOUT_URL,
} from '@/components/menu/navigation/shared/navigation-external-links';
import {
  BottomLink,
  NavigationConfig,
  SectionConfig,
  SectionLink,
} from '@/components/menu/navigation/shared/navigation.type';
import { useTranslate } from '@/hooks/use-translate';
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
  OpenGrcIcon,
  PapermapIcon,
  PostIcon,
  SchoolIcon,
  SlackIcon,
} from '@filigran/icon';
import { PlatformIdentifier } from '@graphql/generated';
import { useLocale } from 'next-intl';

export const usePublicNavigation = (
  visibleServiceSlugs: string[]
): NavigationConfig => {
  const t = useTranslate();
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
        analyticsId: 'nav_library_open',
      },
    ];
  };

  const sections: SectionConfig[] = [
    {
      key: 'xtm-platform',
      analyticsId: 'nav_xtm_platform_open',
      label: t('Menu.XTMPlatform'),
      icon: HomeIcon,
      pathPrefix: `/${locale}`,
      href: `/${locale}`,
      links: [],
    },
    {
      key: 'opencti',
      analyticsId: 'nav_opencti_section_toggle',
      product: PlatformIdentifier.Opencti,
      label: 'OpenCTI',
      icon: OpenCtiIconIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/opencti`,
      links: [
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
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.opencti.io/latest/',
          label: t('Menu.Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
      ],
    },
    {
      key: 'openaev',
      analyticsId: 'nav_openaev_section_toggle',
      product: PlatformIdentifier.Openaev,
      label: 'OpenAEV',
      icon: OpenAevIconIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/openaev`,
      links: [
        ...buildServiceLink(
          ServiceSlug.OPEN_AEV_SCENARIOS,
          t('Menu.Scenarios')
        ),
        {
          href: 'https://demo.openaev.io',
          label: t('Menu.LiveDemo'),
          external: true,
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.openaev.io/latest',
          label: t('Menu.Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
      ],
    },
    {
      key: 'xtm-one',
      analyticsId: 'nav_xtm_one_section_toggle',
      product: PlatformIdentifier.Xtmone,
      label: 'XTM One',
      icon: LogoXtmOneIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/xtm-one`,
      links: [
        {
          href: 'https://demo.xtmone.io/login',
          label: t('Menu.LiveDemo'),
          external: true,
          analyticsId: 'nav_live_demo_open',
        },
        {
          href: 'https://docs.xtmone.io/',
          label: t('Menu.Documentation'),
          external: true,
          analyticsId: 'nav_documentation_open',
        },
        {
          href: XTM_ONE_ABOUT_URL,
          label: t('Menu.About'),
          external: true,
          analyticsId: 'nav_product_about_open',
        },
        { label: t('Menu.AICatalog'), badge: t('Menu.ComingSoon') },
      ],
    },
    {
      key: 'opencrq',
      analyticsId: 'nav_opencrq_section_toggle',
      label: 'OpenCRQ',
      icon: OpenGrcIcon,
      pathPrefix: `/${locale}/cybersecurity-solutions/opencrq`,
      links: [
        {
          href: OPENCRQ_ABOUT_URL,
          label: t('Menu.About'),
          external: true,
          analyticsId: 'nav_product_about_open',
          badge: t('Menu.ComingSoon'),
        },
      ],
    },
  ];

  const bottomLinks: BottomLink[] = [
    ...(visibleSlugs.has(XTM_PLATFORM_ROADMAP_SLUG)
      ? ([
          {
            key: 'xtm-platform-roadmap',
            analyticsId: 'nav_roadmap_open',
            href: `/${locale}/${PUBLIC_CYBERSECURITY_SOLUTIONS_PATH}/${XTM_PLATFORM_ROADMAP_SLUG}`,
            icon: PapermapIcon,
            label: t('Menu.XTMRoadmap'),
          },
        ] satisfies BottomLink[])
      : []),
    {
      key: 'filigran-academy',
      analyticsId: 'nav_academy_open',
      href: 'https://academy.filigran.io/',
      icon: SchoolIcon,
      label: t('Menu.FiligranAcademy'),
      external: true,
    },
    {
      key: 'filigran-blog',
      analyticsId: 'nav_blog_open',
      href: FILIGRAN_BLOG_URL,
      icon: PostIcon,
      label: t('Menu.Blog'),
      external: true,
    },
    {
      key: 'slack',
      analyticsId: 'nav_slack_join',
      href: 'https://filigran-community.slack.com',
      icon: SlackIcon,
      label: t('Menu.Slack'),
      external: true,
    },
    {
      key: 'xtm-platform-trial',
      analyticsId: 'nav_trial_open',
      href: xtmPlatformTrialPublicHref,
      icon: DiamondOutlinedIcon,
      label: t('Menu.XTMPlatformTrial'),
      highlight: true,
    },
  ];

  return { sections, bottomLinks };
};
