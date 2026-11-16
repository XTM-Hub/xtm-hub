import { EpicItemFooter } from '@/components/epic/epic-item/EpicItemFooter';
import {
  DEFAULT_EPIC_SLACK_LINK,
  EPIC_SLACK_LINK_REGEX,
} from '@/components/epic/epic-slack-links';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { DialogBody, DialogFooter } from '@filigran/design-system';
import { EpicFieldsFragment } from '@graphql/generated';
import Link from 'next/link';

interface EpicItemDetailedProps {
  epic: EpicFieldsFragment;
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
    <>
      <DialogBody>
        {epic.description && (
          <MarkdownRenderer
            source={epic.description}
            linkAnalyticsId="roadmap_description_link_open"
          />
        )}
        {sections.map(({ labelKey, source }) => (
          <section key={labelKey}>
            <h3 className="title-xs mt-4 mb-2">{t(labelKey)}</h3>
            <MarkdownRenderer
              source={source}
              linkAnalyticsId="roadmap_description_link_open"
            />
          </section>
        ))}
      </DialogBody>
      <DialogFooter className="markdown-content justify-start *:flex-1">
        <EpicItemFooter epic={epic}>
          <div className="ml-auto flex min-h-9 flex-wrap items-center gap-1">
            <Link
              {...analyticsId('roadmap_epic_slack_join')}
              href={slackLink}
              target="_blank"
              rel="noopener noreferrer">
              <span className="whitespace-nowrap">
                {t('Epic.JoinCommunity')}
              </span>
            </Link>
          </div>
        </EpicItemFooter>
      </DialogFooter>
    </>
  );
};
