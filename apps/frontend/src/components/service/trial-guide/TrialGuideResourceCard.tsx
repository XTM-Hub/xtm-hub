import { TrialGuideResourceCardContent } from '@/components/service/trial-guide/TrialGuide.content';
import { useTranslate } from '@/hooks/use-translate';
import { OpenInNewIcon } from '@filigran/icon';
import { Button, Card, CardContent } from '@filigran/ui';
import Link from 'next/link';

interface ResourceCardProps {
  resourceCard: TrialGuideResourceCardContent;
}

export const TrialGuideResourceCard = ({ resourceCard }: ResourceCardProps) => {
  const t = useTranslate();
  const { Icon, titleKey, descriptionKey, url } = resourceCard;

  return (
    <Card className="bg-elevation-background-layer-2 p-m border-1 border-elevation-border-subtle-layer-2">
      <CardContent className="p-0 flex flex-col gap-s h-full">
        <div className="flex gap-s items-center">
          <Icon className="size-6 shrink-0" />
          <p className="heading-xs">{t(titleKey)}</p>
        </div>
        <p className="text-content-body-compact grow">{t(descriptionKey)}</p>
        {url && (
          <div>
            <Button
              asChild
              variant="tertiary">
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
