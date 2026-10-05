import MarkdownRendererWithTheme from '@/components/ui/MarkdownRendererWithTheme';
import { useTranslate } from '@/hooks/use-translate';

// Component interface
interface ShareableResourceDescriptionProps {
  shortDescription: string;
  longDescription: string;
}

// Component
const ShareableResourceDescription = ({
  shortDescription,
  longDescription,
}: ShareableResourceDescriptionProps) => {
  const t = useTranslate();

  return (
    <div className="flex-[3_3_0%] min-w-0">
      <h2 className="py-s txt-container-title truncate text-muted-foreground">
        {t('Service.ShareableResources.Details.Overview')}
      </h2>
      <section className="rounded bg-elevation-background-layer-1 overflow-x-auto">
        <h3 className="p-l">{shortDescription}</h3>
        <MarkdownRendererWithTheme
          source={longDescription}
          className="p-l !bg-elevation-background-layer-1 markdown-content"
        />
      </section>
    </div>
  );
};

// Component export
export default ShareableResourceDescription;
