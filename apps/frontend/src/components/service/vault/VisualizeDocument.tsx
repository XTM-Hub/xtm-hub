import {
  IconActionContext,
  IconActionsItem,
} from '@/components/ui/IconActions';
import useDecodedParams from '@/hooks/use-decoded-params';
import { useTranslate } from '@/hooks/use-translate';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext } from 'react';
interface DownloadDocumentProps {
  documentData: documentItem_fragment$data;
}

export const VisualizeDocument = ({ documentData }: DownloadDocumentProps) => {
  const { setMenuOpen } = useContext(IconActionContext);
  const t = useTranslate();
  const { slug } = useDecodedParams();
  return (
    <IconActionsItem asChild>
      <a
        href={`/document/visualize/${slug}/${documentData.id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          setMenuOpen(false);
        }}>
        {t('Utils.Visualize')}
      </a>
    </IconActionsItem>
  );
};

export default VisualizeDocument;
