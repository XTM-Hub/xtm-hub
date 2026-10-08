import { useTranslate } from '@/hooks/use-translate';
import { fileToBase64 } from '@/lib/utils';
import {
  getFileSelectLabels,
  toFileSelectValue,
} from '@/utils/design-system/file-select';
import {
  docIsExistingFile,
  ExistingFile,
  isFile,
  NewFile,
} from '@/utils/documents';
import { EntityTypeOrFiligranLogo } from '@/utils/shareable-resources/entity-type';
import { FileSelect, IconButton } from '@filigran/design-system';
import { DeleteIcon } from '@filigran/icon';
import { FormControl, FormItem, FormLabel, FormMessage } from '@filigran/ui';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentSourceType } from '@graphql/generated';
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
  const { name, ref, value } = field;
  const logo = value?.length ? value[0] : undefined;
  return (
    <FormItem>
      <FormLabel>
        {t('Service.Form.LogoLabel')} ({t('Service.Form.LogoDisclaimer')})
      </FormLabel>
      <div className="grid grid-cols-1 s:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3">
        {logo ? (
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
              <IconButton
                disabled={logo.source_type === DocumentSourceType.External}
                variant="destructive"
                priority="secondary"
                type="button"
                className="ml-auto m-s"
                aria-label={t('Utils.Delete')}
                icon={<DeleteIcon className="size-4" />}
                onClick={() => {
                  field.onChange([]);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-24 p-m border border-light flex items-center justify-center">
            <EntityTypeOrFiligranLogo entityTypes={entityTypes} />
          </div>
        )}
      </div>

      <FormControl>
        <FileSelect
          {...getFileSelectLabels(t)}
          aria-label={t('Service.Form.LogoLabel')}
          triggerLabel={t('Service.Form.UploadLogo')}
          placeholder={t('Service.FileForm.NoDocument')}
          accept="image/jpeg, image/gif, image/png, image/svg+xml"
          disabled={logo?.source_type === DocumentSourceType.External}
          name={name}
          ref={ref}
          value={toFileSelectValue(value)}
          onValueChange={async (next) => {
            if (!isFile(next)) {
              field.onChange([]);
              return;
            }
            const newFile = next as NewFile & {
              source_type: DocumentSourceType;
            };
            newFile.preview = await fileToBase64(next);
            newFile.id = new Date().getTime().toString();
            newFile.source_type = DocumentSourceType.Internal;
            field.onChange([newFile]);
          }}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
