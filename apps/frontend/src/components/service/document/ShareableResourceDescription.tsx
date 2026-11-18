import ResourceMarkdownRenderer from '@/components/service/document/ResourceMarkdownRenderer';
import { useTranslate } from '@/hooks/use-translate';
import { getResourcePageFiligranWebsiteUtm } from '@/utils/filigran-website-utm';
import { Paper } from '@filigran/design-system';

// Component interface
interface ShareableResourceDescriptionProps {
  shortDescription: string;
  longDescription: string;
  serviceDefinitionIdentifier?: string;
}

// Component
const ShareableResourceDescription = ({
  shortDescription,
  longDescription,
  serviceDefinitionIdentifier,
}: ShareableResourceDescriptionProps) => {
  const t = useTranslate();

  return (
    <div className="flex-[3_3_0%] min-w-0">
      <Paper
        as="section"
        padding={16}
        className="overflow-x-auto"
        title={
          <h2 className="[font:inherit] tracking-[inherit]">
            {t('Service.ShareableResources.Details.Overview')}
          </h2>
        }>
        <div className="flex flex-col gap-8">
          <h3>{shortDescription}</h3>
          <ResourceMarkdownRenderer
            source={longDescription}
            filigranWebsiteUtm={getResourcePageFiligranWebsiteUtm(
              serviceDefinitionIdentifier
            )}
          />
        </div>
      </Paper>
    </div>
  );
};

// Component export
export default ShareableResourceDescription;
