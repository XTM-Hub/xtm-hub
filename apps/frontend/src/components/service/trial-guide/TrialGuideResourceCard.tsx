import { TrialGuideResourceCardContent } from '@/components/service/trial-guide/TrialGuide.content';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsLinkType } from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { Button, Card, CardContent } from '@filigran/design-system';
import { OpenInNewIcon } from '@filigran/icon';
import Link from 'next/link';

interface ResourceCardProps {
  resourceCard: TrialGuideResourceCardContent;
}

export const TrialGuideResourceCard = ({ resourceCard }: ResourceCardProps) => {
  const t = useTranslate();
  const {
    Icon,
    titleKey,
    descriptionKey,
    url,
    analyticsId: elementId,
    linkType,
  } = resourceCard;

  return (
    <Card
      elevation={2}
      padding={8}>
      <CardContent
        clamp={0}
        className="flex flex-col gap-2 h-full">
        <div className="flex gap-2 items-center">
          <Icon className="size-6 shrink-0" />
          <p className="title-xs">{t(titleKey)}</p>
        </div>
        <p className="text-content-compact grow">{t(descriptionKey)}</p>
        {url && (
          <div>
            <Button
              asChild
              priority="tertiary">
              <Link
                {...analyticsId(elementId)}
                {...analyticsLinkType(linkType)}
                href={url}
                target="_blank"
                rel="noopener noreferrer">
                {t('Service.TrialGuide.SeeMore')}
                <OpenInNewIcon className="size-3 ml-3" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrialGuideResourceCard;
