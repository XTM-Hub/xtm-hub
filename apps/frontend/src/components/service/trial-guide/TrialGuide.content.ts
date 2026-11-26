import { type AnalyticsElementId } from '@/lib/analytics/analytics.ids';
import { type AnalyticsLinkType } from '@/lib/analytics/analytics.types';
import {
  DescriptionOutlinedIcon,
  GroupIcon,
  InfoIcon,
  SchoolIcon,
} from '@filigran/icon';
import { PlatformIdentifier } from '@graphql/generated';
import { ComponentType } from 'react';

export interface TrialGuideResourceCardContent {
  id: string;
  Icon: ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  url: string;
  analyticsId: AnalyticsElementId;
  linkType: AnalyticsLinkType;
}

export interface TrialGuideChecklistItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  exampleKey?: string;
  readMoreUrl?: string;
}

export interface TrialGuideTabContent {
  resourceCards: TrialGuideResourceCardContent[];
  checklistItems: TrialGuideChecklistItem[];
}

export const TRIAL_GUIDE_CONTENT: Record<
  PlatformIdentifier,
  TrialGuideTabContent
> = {
  [PlatformIdentifier.Opencti]: {
    resourceCards: [
      {
        id: 'documentation',
        analyticsId: 'trial_guide_documentation_open',
        linkType: 'Documentation',
        Icon: DescriptionOutlinedIcon,
        titleKey:
          'Service.TrialGuide.Opencti.ResourceCards.Documentation.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ResourceCards.Documentation.Description',
        url: 'https://docs.opencti.io/latest/',
      },
      {
        id: 'academy',
        analyticsId: 'trial_guide_academy_open',
        linkType: 'Academy',
        Icon: SchoolIcon,
        titleKey: 'Service.TrialGuide.Opencti.ResourceCards.Academy.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ResourceCards.Academy.Description',
        url: 'https://academy.filigran.io/opencti',
      },
      {
        id: 'community',
        analyticsId: 'trial_guide_community_join',
        linkType: 'Community',
        Icon: GroupIcon,
        titleKey: 'Service.TrialGuide.Opencti.ResourceCards.Community.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ResourceCards.Community.Description',
        url: 'https://filigran-community.slack.com/archives/CHZC2D38C',
      },
      {
        id: 'release-notes',
        analyticsId: 'trial_guide_release_notes_open',
        linkType: 'Release notes',
        Icon: InfoIcon,
        titleKey: 'Service.TrialGuide.Opencti.ResourceCards.ReleaseNotes.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ResourceCards.ReleaseNotes.Description',
        url: 'https://github.com/OpenCTI-Platform/opencti/releases',
      },
    ],
    checklistItems: [
      {
        id: 'activate-feeds',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ActivateFeeds.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ActivateFeeds.Description',
        readMoreUrl: 'https://docs.opencti.io/latest/usage/import/rss-feed/',
      },
      {
        id: 'configure-pir',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ConfigurePir.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ConfigurePir.Description',
        readMoreUrl:
          'https://docs.opencti.io/latest/usage/pir/?h=create+pir#pir-creation-and-how-entities-of-interest-are-determined',
      },
      {
        id: 'follow-graph',
        titleKey: 'Service.TrialGuide.Opencti.ChecklistItems.FollowGraph.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.FollowGraph.Description',
        readMoreUrl:
          'https://docs.opencti.io/latest/usage/exploring-analysis/#graph-view',
      },
      {
        id: 'create-case',
        titleKey: 'Service.TrialGuide.Opencti.ChecklistItems.CreateCase.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CreateCase.Description',
        readMoreUrl: 'https://docs.opencti.io/latest/usage/case-management/',
      },
      {
        id: 'create-fintel-report',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CreateFintelReport.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CreateFintelReport.Description',
        readMoreUrl: 'https://docs.opencti.io/latest/usage/exploring-analysis/',
      },
      {
        id: 'build-dashboard-widget',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.BuildDashboardWidget.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.BuildDashboardWidget.Description',
        readMoreUrl: 'https://docs.opencti.io/latest/usage/widgets/',
      },
      {
        id: 'connect-security-stack',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ConnectSecurityStack.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.ConnectSecurityStack.Description',
        readMoreUrl:
          'https://docs.opencti.io/latest/deployment/connectors/?h=connectors',
      },
      {
        id: 'create-no-code-playbook',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CreateNoCodePlaybook.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CreateNoCodePlaybook.Description',
        readMoreUrl:
          'https://docs.opencti.io/latest/usage/playbook-components/',
      },
      {
        id: 'check-security-coverage',
        titleKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CheckSecurityCoverage.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.CheckSecurityCoverage.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/foundations/scenarios-and-simulations/',
      },
      {
        id: 'enable-agent',
        titleKey: 'Service.TrialGuide.Opencti.ChecklistItems.EnableAgent.Title',
        descriptionKey:
          'Service.TrialGuide.Opencti.ChecklistItems.EnableAgent.Description',
      },
    ],
  },
  [PlatformIdentifier.Openaev]: {
    resourceCards: [
      {
        id: 'documentation',
        analyticsId: 'trial_guide_documentation_open',
        linkType: 'Documentation',
        Icon: DescriptionOutlinedIcon,
        titleKey:
          'Service.TrialGuide.Openaev.ResourceCards.Documentation.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ResourceCards.Documentation.Description',
        url: 'https://docs.openaev.io/latest/',
      },
      {
        id: 'academy',
        analyticsId: 'trial_guide_academy_open',
        linkType: 'Academy',
        Icon: SchoolIcon,
        titleKey: 'Service.TrialGuide.Openaev.ResourceCards.Academy.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ResourceCards.Academy.Description',
        url: 'https://academy.filigran.io/course/getting-started-with-openaev',
      },
      {
        id: 'community',
        analyticsId: 'trial_guide_community_join',
        linkType: 'Community',
        Icon: GroupIcon,
        titleKey: 'Service.TrialGuide.Openaev.ResourceCards.Community.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ResourceCards.Community.Description',
        url: 'https://filigran-community.slack.com/archives/CJ1PHBHF1',
      },
      {
        id: 'release-notes',
        analyticsId: 'trial_guide_release_notes_open',
        linkType: 'Release notes',
        Icon: InfoIcon,
        titleKey: 'Service.TrialGuide.Openaev.ResourceCards.ReleaseNotes.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ResourceCards.ReleaseNotes.Description',
        url: 'https://github.com/OpenAEV-Platform/openaev/releases',
      },
    ],
    checklistItems: [
      {
        id: 'install-starter-pack',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.InstallStarterPack.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.InstallStarterPack.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/getting-started/?h=starter+pack#starter-pack',
      },
      {
        id: 'run-atomic-test',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.RunAtomicTest.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.RunAtomicTest.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/evaluate/atomic-testing/atomic-testing/?h=atomi',
      },
      {
        id: 'launch-time-based-scenario',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.LaunchTimeBasedScenario.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.LaunchTimeBasedScenario.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/build/scenario/scenario/',
      },
      {
        id: 'run-attack-chaining-scenario',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.RunAttackChainingScenario.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.RunAttackChainingScenario.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/autonomous-attack-chaining/scenario-creation/?h=ai#the-three-entry-points',
      },
      {
        id: 'drive-tabletop-exercise',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.DriveTabletopExercise.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.DriveTabletopExercise.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/build/components/phishing/overview/',
      },
      {
        id: 'evaluate-security-posture',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.EvaluateSecurityPosture.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.EvaluateSecurityPosture.Description',
        readMoreUrl: 'https://docs.openaev.io/latest/usage/evaluate/overview/',
      },
      {
        id: 'generate-detection-remediation-rules',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.GenerateDetectionRemediationRules.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.GenerateDetectionRemediationRules.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/evaluate/injects/inject-result/?h=remediation#remediations-enterprise-edition:~:text=patterns%2C%20and%20domains.-,Remediations%20(Enterprise%20Edition),-Enterprise%20Edition',
      },
      {
        id: 'connect-opencti-security-coverage',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.ConnectOpenctiSecurityCoverage.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.ConnectOpenctiSecurityCoverage.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/evaluate/xtm-suite-connector/?h=',
      },
      {
        id: 'enable-agent-xtm-one',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.EnableAgentXtmOne.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.EnableAgentXtmOne.Description',
      },
      {
        id: 'generate-report-stakeholders',
        titleKey:
          'Service.TrialGuide.Openaev.ChecklistItems.GenerateReportStakeholders.Title',
        descriptionKey:
          'Service.TrialGuide.Openaev.ChecklistItems.GenerateReportStakeholders.Description',
        readMoreUrl:
          'https://docs.openaev.io/latest/usage/evaluate/reporting/reporting/?h=report+gener#generate-a-report:~:text=report%20configuration%20changes.-,Generate%20a%20report,-Generate%20a',
      },
    ],
  },
  [PlatformIdentifier.Xtmone]: {
    resourceCards: [
      {
        id: 'documentation',
        analyticsId: 'trial_guide_documentation_open',
        linkType: 'Documentation',
        Icon: DescriptionOutlinedIcon,
        titleKey: 'Service.TrialGuide.Xtmone.ResourceCards.Documentation.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ResourceCards.Documentation.Description',
        url: 'https://docs.xtmone.io/',
      },
      {
        id: 'community',
        analyticsId: 'trial_guide_community_join',
        linkType: 'Community',
        Icon: GroupIcon,
        titleKey: 'Service.TrialGuide.Xtmone.ResourceCards.Community.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ResourceCards.Community.Description',
        url: 'https://filigran-community.slack.com/archives/CHNEM9NUT',
      },
    ],
    checklistItems: [
      {
        id: 'activate-ctem-assistant',
        titleKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.ActivateCtemAssistant.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.ActivateCtemAssistant.Description',
      },
      {
        id: 'ask-question-plain-english',
        titleKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.AskQuestionPlainEnglish.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.AskQuestionPlainEnglish.Description',
      },
      {
        id: 'build-threat-hunting-package',
        titleKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.BuildThreatHuntingPackage.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.BuildThreatHuntingPackage.Description',
        exampleKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.BuildThreatHuntingPackage.ExamplePrompt',
      },
      {
        id: 'integrate-tools',
        titleKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.IntegrateTools.Title',
        descriptionKey:
          'Service.TrialGuide.Xtmone.ChecklistItems.IntegrateTools.Description',
      },
    ],
  },
};
