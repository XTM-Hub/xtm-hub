import {
  IconActionContext,
  IconActionsItem,
} from '@/components/ui/IconActions';
import useDecodedParams from '@/hooks/use-decoded-params';
import { useTranslate } from '@/hooks/use-translate';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useContext } from 'react';
import { commitLocalUpdate, useRelayEnvironment } from 'react-relay';
interface DownloadDocumentProps {
  documentData: documentItem_fragment$data;
}

export const DownloadDocument = ({ documentData }: DownloadDocumentProps) => {
  const { setMenuOpen } = useContext(IconActionContext);
  const t = useTranslate();
  const { slug } = useDecodedParams();
  const environment = useRelayEnvironment();

  const setDownloadNumber = () => {
    commitLocalUpdate(environment, (store) => {
      const documentRecord = store.get(documentData.id);
      if (documentRecord) {
        const currentDownloadNumber: number =
          (documentRecord.getValue('download_number') as number) ?? 0;
        documentRecord.setValue(currentDownloadNumber + 1, 'download_number');
      }
    });
  };

  return (
    <IconActionsItem asChild>
      <a
        href={`/document/get/${slug}/${documentData.id}?attach=1`}
        onClick={(e) => {
          setDownloadNumber();
          e.stopPropagation();
          setMenuOpen(false);
        }}>
        {t('Utils.Download')}
      </a>
    </IconActionsItem>
  );
};

export default DownloadDocument;
