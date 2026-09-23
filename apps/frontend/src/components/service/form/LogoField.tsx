import { useTranslate } from '@/hooks/use-translate';
import { fileToBase64 } from '@/lib/utils';
import { docIsExistingFile, ExistingFile, NewFile } from '@/utils/documents';
import { EntityTypeOrFiligranLogo } from '@/utils/shareable-resources/entity-type';
import { DeleteIcon } from '@filigran/icon';
import {
  FileInput,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@filigran/ui';
import { TooltipProvider } from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentSourceType } from '@graphql/generated';
import { ChangeEvent } from 'react';
import { ControllerRenderProps, FieldValues, useWatch } from 'react-hook-form';

interface ServiceFormLogoFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  document?: documentItem_fragment$data;
}

export const ServiceFormLogoField = ({
  document,
  field,
}: ServiceFormLogoFieldProps) => {
  const t = useTranslate();

  const entityTypes = useWatch<{ entity_types?: string[] }, 'entity_types'>({
    name: 'entity_types',
  });
  const logo = field.value?.length ? field.value[0] : undefined;
  return (
    <FormItem>
      <FormLabel>
        {t('Service.Form.LogoLabel')} ({t('Service.Form.LogoDisclaimer')})
      </FormLabel>
      <div className="grid grid-cols-1 s:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3">
        {logo ? (
          <TooltipProvider delayDuration={1}>
            <div
              style={{
                backgroundImage: docIsExistingFile(logo)
                  ? `url(/document/visualize/${document!.service_instance!.id}/${logo!.id})`
                  : `url(${logo.preview})`,
                backgroundSize: 'cover',
              }}
              className="min-h-[15rem] border rounded relative">
              <div className="flex flex-row items-center bg-elevation-background-layer-1 h-12 opacity-90">
                <div className="truncate overflow-hidden whitespace-nowrap text-ellipsis ml-s mr-s flex-1 min-w-0">
                  {(logo as ExistingFile)?.file_name ?? (logo as NewFile)?.name}
                </div>
                <Button
                  disabled={logo.source_type === DocumentSourceType.External}
                  variant="secondary-destructive"
                  size="icon"
                  type="button"
                  className="ml-auto m-s"
                  onClick={() => {
                    field.onChange([]);
                  }}>
                  <DeleteIcon className="size-4" />
                </Button>
              </div>
            </div>
          </TooltipProvider>
        ) : (
          <div className="w-24 p-m border border-light flex items-center justify-center">
            <EntityTypeOrFiligranLogo entityTypes={entityTypes} />
          </div>
        )}
      </div>

      <FormControl>
        <FileInput
          {...field}
          isFileNameHidden
          onChangeCapture={async (e: ChangeEvent<HTMLInputElement>) => {
            const localImages = [];
            if (e.target?.files) {
              for (const image of Array.from(e.target.files)) {
                const extendedImage = image as NewFile & {
                  source_type: DocumentSourceType;
                };
                extendedImage.preview = await fileToBase64(image as File);
                extendedImage.id = new Date().getTime().toString();
                extendedImage.source_type = DocumentSourceType.Internal;
                localImages.push(extendedImage);
              }
            }
            field.onChange(localImages);
            return false;
          }}
          disabled={logo?.source_type === DocumentSourceType.External}
          texts={{
            selectFile: t('Service.Form.UploadLogo'),
            noFile: t('Service.Vault.FileForm.NoDocument'),
            dropFiles: t('Service.Vault.FileForm.DropDocuments'),
          }}
          allowedTypes={'image/jpeg, image/gif, image/png, image/svg'}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
