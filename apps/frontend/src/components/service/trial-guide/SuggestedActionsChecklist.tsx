import { PlatformMetadataMapping } from '@/components/registration/PlatformIdentifierMapping';
import { ChecklistItem } from '@/components/service/trial-guide/ChecklistItem';
import { TrialGuideChecklistItem } from '@/components/service/trial-guide/TrialGuide.content';
import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { PlatformIdentifier } from '@graphql/generated';

interface SuggestedActionsChecklistProps {
  checklistItems: TrialGuideChecklistItem[];
  platformIdentifier: PlatformIdentifier;
}

export const SuggestedActionsChecklist = ({
  checklistItems,
  platformIdentifier,
}: SuggestedActionsChecklistProps) => {
  const t = useTranslate();
  const { name, Icon, iconClassName } =
    PlatformMetadataMapping[platformIdentifier];

  return (
    <section className="mt-xl">
      <div className="max-w-4xl mx-auto mb-xxl">
        <div className="flex items-center gap-s mb-s">
          <Icon className={cn('w-8.5 h-8.5', iconClassName)} />
          <span className="text-logo">{name}</span>
        </div>
        <h2 className="heading-lg">{t('Service.TrialGuide.ChecklistTitle')}</h2>
        <p className="text-content-body-medium mt-s">
          {t('Service.TrialGuide.ChecklistIntro')}
        </p>
      </div>
      <div className="max-w-4xl mx-auto">
        {checklistItems.map((item, index) => (
          <ChecklistItem
            key={item.id}
            index={index + 1}
            item={item}
          />
        ))}
      </div>
    </section>
  );
};

export default SuggestedActionsChecklist;
