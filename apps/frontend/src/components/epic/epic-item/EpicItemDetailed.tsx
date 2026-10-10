import { EpicItemFooter } from '@/components/epic/epic-item/EpicItemFooter';
import {
  DEFAULT_EPIC_SLACK_LINK,
  EPIC_SLACK_LINK_REGEX,
} from '@/components/epic/epic-slack-links';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { Separator } from '@/components/ui/separator';
import { useTranslate } from '@/hooks/use-translate';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import Link from 'next/link';

interface EpicItemDetailedProps {
  epic: epic_fragment$data;
}

export const EpicItemDetailed = ({ epic }: EpicItemDetailedProps) => {
  const t = useTranslate();
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <h2 className="pr-8">{epic.title}</h2>
      <p className="text-muted-foreground text-sm">{epic.short_description}</p>
      <Separator className="my-s" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {epic.description && <MarkdownRenderer source={epic.description} />}
        {sections.map(({ labelKey, source }) => (
          <section key={labelKey}>
            <h3 className="mt-4 mb-2 text-lg font-semibold">{t(labelKey)}</h3>
            <MarkdownRenderer source={source} />
          </section>
        ))}
      </div>
      <Separator />
      <div className="markdown-content">
        <EpicItemFooter epic={epic}>
          <p className="flex min-h-9 flex-wrap items-center gap-1">
            <Link
              href={slackLink}
              target="_blank"
              rel="noopener noreferrer">
              <span className="whitespace-nowrap">
                {t('Epic.JoinCommunity')}
              </span>
            </Link>
          </p>
        </EpicItemFooter>
      </div>
    </div>
  );
};
