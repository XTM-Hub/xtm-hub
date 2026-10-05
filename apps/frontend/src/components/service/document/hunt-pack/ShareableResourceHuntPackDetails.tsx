'use client';

import { ShareableResourceDetailItem } from '@/components/service/document/ui/ShareableResourceDetailItem';
import { useConnectorTypeLabels } from '@/components/service/integrations/connector-type/use-connector-type-labels';
import { useTranslate } from '@/hooks/use-translate';
import { HuntPackFields } from '@/utils/shareable-resources/shareable-resources.types';
import { Button, Chip } from '@filigran/design-system';
import { useId, useState } from 'react';

/** Techniques shown before the list folds into "and N more". */
export const HUNT_PACK_VISIBLE_TECHNIQUES = 12;

interface ShareableResourceHuntPackDetailsProps {
  huntPack: HuntPackFields;
}

export const ShareableResourceHuntPackDetails = ({
  huntPack,
}: ShareableResourceHuntPackDetailsProps) => {
  const t = useTranslate();
  const { huntPlatformLabel } = useConnectorTypeLabels();
  const [showAllTechniques, setShowAllTechniques] = useState(false);
  const techniquesId = useId();

  const techniques = huntPack.attack_techniques;
  const hiddenTechniques = Math.max(
    techniques.length - HUNT_PACK_VISIBLE_TECHNIQUES,
    0
  );
  const visibleTechniques = showAllTechniques
    ? techniques
    : techniques.slice(0, HUNT_PACK_VISIBLE_TECHNIQUES);
  const platforms = huntPack.hunt_platforms.map(huntPlatformLabel);

  return (
    <>
      {huntPack.hunt_count != null && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.Hunts')}>
          <span>
            {t('Service.ShareableResources.Details.HuntCount', {
              count: huntPack.hunt_count,
            })}
          </span>
        </ShareableResourceDetailItem>
      )}
      {platforms.length > 0 && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.HuntedPlatforms')}>
          <span>{platforms.join(', ')}</span>
        </ShareableResourceDetailItem>
      )}
      {techniques.length > 0 && (
        <ShareableResourceDetailItem
          label={t('Service.ShareableResources.Details.AttackTechniques')}>
          <div className="flex flex-col items-start gap-s">
            <ul
              id={techniquesId}
              className="flex flex-wrap gap-xs">
              {visibleTechniques.map((technique) => (
                <li key={technique}>
                  <Chip label={technique} />
                </li>
              ))}
            </ul>
            {hiddenTechniques > 0 && (
              <Button
                priority="tertiary"
                size="sm"
                aria-expanded={showAllTechniques}
                aria-controls={techniquesId}
                onClick={() => setShowAllTechniques((shown) => !shown)}>
                {showAllTechniques
                  ? t('Service.ShareableResources.Details.ShowFewerItems')
                  : t('Service.ShareableResources.Details.MoreItems', {
                      count: hiddenTechniques,
                    })}
              </Button>
            )}
          </div>
        </ShareableResourceDetailItem>
      )}
    </>
  );
};
