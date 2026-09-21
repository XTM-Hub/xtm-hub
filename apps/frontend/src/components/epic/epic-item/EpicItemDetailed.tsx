import { EpicItemFooter } from '@/components/epic/epic-item/EpicItemFooter';
import {
  DEFAULT_EPIC_SLACK_LINK,
  EPIC_SLACK_LINK_REGEX,
} from '@/components/epic/epic-slack-links';
import MarkdownRendererWithTheme from '@/components/ui/MarkdownRendererWithTheme';
import { Separator } from '@filigran/ui/clients';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface EpicItemDetailedProps {
  epic: epic_fragment$data;
  serviceInstanceId: string;
}

export const EpicItemDetailed = ({
  epic,
  serviceInstanceId,
}: EpicItemDetailedProps) => {
  const t = useTranslations();
  const slackLink =
    epic.slack_link && EPIC_SLACK_LINK_REGEX.test(epic.slack_link)
      ? epic.slack_link
      : DEFAULT_EPIC_SLACK_LINK;
  const sections = [
    { labelKey: 'Epic.Form.ProblemToSolve', source: epic.problem_to_solve },
    { labelKey: 'Epic.Form.ProposedSolution', source: epic.proposed_solution },
    { labelKey: 'Epic.Form.ExpectedValue', source: epic.expected_value },
  ].filter(({ source }) => source);

  return (
    <div className="p-l bg-elevation-background-layer-1 flex h-full min-h-0 flex-1 flex-col">
      <h2>{epic.title}</h2>
      <p className="text-muted-foreground text-sm">{epic.short_description}</p>
      <Separator className="my-s" />
      <div className="markdown-content min-h-0 flex-1 overflow-y-auto">
        {epic.description && (
          <MarkdownRendererWithTheme source={epic.description} />
        )}
        {sections.map(({ labelKey, source }) => (
          <section key={labelKey}>
            <h3>{t(labelKey)}</h3>
            <MarkdownRendererWithTheme source={source} />
          </section>
        ))}
      </div>
      <Separator />
      <div className="flex flex-row">
        <EpicItemFooter
          epic={epic}
          serviceInstanceId={serviceInstanceId}
        />
        <p className="flex flex-wrap items-center gap-1">
          <Link
            href={slackLink}
            target="_blank"
            rel="noopener noreferrer">
            <span className="whitespace-nowrap">{t('Epic.JoinCommunity')}</span>
          </Link>
        </p>
      </div>
    </div>
  );
};
