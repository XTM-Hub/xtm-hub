import { TrialGuideResourceCardContent } from '@/components/service/trial-guide/TrialGuide.content';
import { useTranslate } from '@/hooks/use-translate';
import { Button, Card, CardContent } from '@filigran/design-system';
import { OpenInNewIcon } from '@filigran/icon';
import Link from 'next/link';

interface ResourceCardProps {
  resourceCard: TrialGuideResourceCardContent;
}

export const TrialGuideResourceCard = ({ resourceCard }: ResourceCardProps) => {
  const t = useTranslate();
  const { Icon, titleKey, descriptionKey, url } = resourceCard;

  return (
    <Card
      elevation={2}
      padding={8}>
      <CardContent
        clamp={0}
        className="flex flex-col gap-s h-full">
        <div className="flex gap-s items-center">
          <Icon className="size-6 shrink-0" />
          <p className="heading-xs">{t(titleKey)}</p>
        </div>
        <p className="text-content-body-compact grow">{t(descriptionKey)}</p>
        {url && (
          <div>
            <Button
              asChild
              priority="tertiary">
              <Link
                href={url}
                target="_blank"
                rel="noopener noreferrer">
                {t('Service.TrialGuide.SeeMore')}
                <OpenInNewIcon className="size-3 ml-m" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrialGuideResourceCard;
