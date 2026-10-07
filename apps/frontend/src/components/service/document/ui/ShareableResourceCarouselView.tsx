'use client';
import { Carousel, CarouselItem } from '@filigran/ui/clients';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { PublicDocumentData } from '@/utils/shareable-resources/shareable-resources.types';
import { Dialog, DialogContent } from '@filigran/design-system';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import Image from 'next/image';

// Component interface
interface ShareableResourceCarouselProps {
  images?:
    | documentItem_fragment$data['children_documents']
    | PublicDocumentData['children_documents'];
  serviceInstance:
    seoServiceInstanceFragment$data | serviceInstance_fragment$data;
  className?: string;
}

const ShareableResourceCarousel = ({
  images,
  serviceInstance,
  className,
}: ShareableResourceCarouselProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [pictureIndex, setPictureIndex] = useState<number>(0);
  const fileNames = (images ?? []).map((image) => image?.id);
  const handleCarouselImageClick = (open: boolean, index: number) => {
    setOpen(open);
    setPictureIndex(index);
  };
  return (
    <>
      {fileNames.length > 0 && (
        <Carousel className={cn('h-[35vh]', className)}>
          {fileNames.map((name, index) => (
            <CarouselItem
              key={name}
              className="cursor-pointer"
              onClick={() => handleCarouselImageClick(true, index)}>
              <Image
                fill
                objectFit="cover"
                objectPosition="top"
                src={`/document/images/${serviceInstance.id}/${name}`}
                alt={`A picture of ${name}`}
              />
            </CarouselItem>
          ))}
          <Dialog
            open={open}
            onOpenChange={setOpen}>
            <DialogContent size="lg">
              <Carousel
                className="h-[80vh]"
                opts={{
                  startIndex: pictureIndex,
                }}>
                {fileNames.map((name) => (
                  <CarouselItem key={name}>
                    <Image
                      fill
                      objectFit="contain"
                      src={`/document/images/${serviceInstance.id}/${name}`}
                      alt={`A picture of ${name}`}
                    />
                  </CarouselItem>
                ))}
              </Carousel>
            </DialogContent>
          </Dialog>
        </Carousel>
      )}
    </>
  );
};

export default ShareableResourceCarousel;
