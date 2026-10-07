import { cn } from '@/lib/utils';
import {
  EntityTypeIcon,
  getEntityTypeLabel,
} from '@/utils/shareable-resources/entity-type';
import { Chip } from '@filigran/design-system';

interface DocumentWithEntityTypes {
  entity_types?: readonly string[] | null;
}

export const getEntityTypes = (document: DocumentWithEntityTypes): string[] => {
  return document.entity_types ? [...document.entity_types] : [];
};

interface ShareableResourceEntityTypesProps {
  document: DocumentWithEntityTypes;
  className?: string;
}

/**
 * Renders the OpenCTI entity types of a Custom View as badges (icon + label).
 * Returns null when the document has no entity types.
 */
export const ShareableResourceEntityTypes = ({
  document,
  className,
}: ShareableResourceEntityTypesProps) => {
  const entityTypes = getEntityTypes(document);
  if (entityTypes.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-s', className)}>
      {entityTypes.map((entityType) => (
        <Chip
          key={entityType}
          label={getEntityTypeLabel(entityType)}
          startIcon={
            <EntityTypeIcon
              entityType={entityType}
              className="size-4"
            />
          }
        />
      ))}
    </div>
  );
};
