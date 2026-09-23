import { useTranslate } from '@/hooks/use-translate';
import { fileToBase64 } from '@/lib/utils';
import { docIsExistingFile, ExistingFile, NewFile } from '@/utils/documents';
import { AddIcon, DeleteIcon, ReplayIcon } from '@filigran/icon';
import {
  FileInput,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@filigran/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { DocumentSourceType } from '@graphql/generated';
import { ChangeEvent, useRef } from 'react';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';

export type ServiceFormMultipleImagesFieldImages = (ExistingFile | NewFile) & {
  source_type: DocumentSourceType;
};

interface ServiceFormMultipleImagesFieldProps {
  field: ControllerRenderProps<FieldValues, string>;
  document?: documentItem_fragment$data;
  images: Array<ServiceFormMultipleImagesFieldImages>;
  setImages: (images: Array<ServiceFormMultipleImagesFieldImages>) => void;
  imagesToDelete: string[];
  setImagesToDelete: (ids: string[]) => void;
  setIsDirty: (isDirty: boolean) => void;
}

export const ServiceFormMultipleImagesField = ({
  field: { ref, value },
  document,
  images,
  setImages,
  imagesToDelete,
  setImagesToDelete,
  setIsDirty,
}: ServiceFormMultipleImagesFieldProps) => {
  const t = useTranslate();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <FormItem>
        <FormLabel className="flex items-center h-6">
          {t('Service.Form.ImageLabel')}
          <Button
            size="icon"
            variant="link"
            onClick={(e) => {
              e.preventDefault();
              inputRef.current!.click();
            }}>
            <AddIcon className="size-3" />
          </Button>
        </FormLabel>
        <FormControl>
          <FileInput
            multiple
            hidden
            name="images"
            onChangeCapture={async (e: ChangeEvent<HTMLInputElement>) => {
              const localImages = [...images];
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
              setImages(localImages);
              return false;
            }}
            texts={{
              selectFile: t('Service.Form.UploadImage'),
              noFile: t('Service.Form.NoImage'),
              dropFiles: t('Service.Form.DropDocuments'),
            }}
            allowedTypes={'image/jpeg, image/png'}
            ref={(e: HTMLInputElement) => {
              ref(e);
              inputRef.current = e;
            }}
            value={value ? [value] : []}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
      <p className="text-xs">{t('Service.Form.ImagesDisclaimer')}</p>
      {images?.length > 0 && (
        <div
          className="grid grid-cols-1 s:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-xl min-h-[15rem] pb-xl"
          data-testid="images-grid">
          <TooltipProvider delayDuration={1}>
            {images.map((doc) => (
              <div
                key={doc!.id}
                style={{
                  backgroundImage: docIsExistingFile(doc)
                    ? `url(/document/visualize/${document!.service_instance!.id}/${doc!.id})`
                    : `url(${doc.preview})`,
                  backgroundSize: 'cover',
                }}
                className="min-h-[15rem] border rounded relative">
                <div
                  className={`absolute inset-0 bg-black flex flex-col items-center justify-center transition-all duration-800 ease-in ${
                    imagesToDelete.includes(doc!.id)
                      ? 'bg-black/90 opacity-100'
                      : 'bg-black/0 opacity-0'
                  }`}>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2"
                    type="button"
                    onClick={() => {
                      setImagesToDelete(
                        imagesToDelete.filter((id) => id !== doc!.id)
                      );
                    }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ReplayIcon className="size-4" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('Service.Form.Restore')}
                      </TooltipContent>
                    </Tooltip>
                  </Button>
                  <DeleteIcon
                    focusable={false}
                    className="size-6 text-muted-foreground"
                  />
                </div>

                {!imagesToDelete.includes(doc!.id) && (
                  <div className="flex flex-row items-center bg-elevation-background-layer-1 h-12 opacity-90">
                    <div className="truncate overflow-hidden whitespace-nowrap text-ellipsis ml-s mr-s flex-1 min-w-0">
                      {(doc as ExistingFile)?.file_name ??
                        (doc as NewFile)?.name}
                    </div>
                    <Button
                      disabled={doc.source_type === DocumentSourceType.External}
                      variant="secondary-destructive"
                      size="icon"
                      type="button"
                      className="ml-auto m-s"
                      onClick={() => {
                        setImagesToDelete([...imagesToDelete, doc!.id]);
                        setIsDirty(true);
                      }}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DeleteIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('Service.Form.DeleteSentence')}
                        </TooltipContent>
                      </Tooltip>
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TooltipProvider>
        </div>
      )}
    </>
  );
};
