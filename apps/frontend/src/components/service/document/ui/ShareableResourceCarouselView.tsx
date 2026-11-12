'use client';
import { useState } from 'react';

import { Carousel, CarouselItem } from '@/components/ui/carousel';
import { useTranslate } from '@/hooks/use-translate';
import {
  analyticsResource,
  type AnalyticsResourceData,
} from '@/lib/analytics/analytics.context';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@filigran/design-system';
import { serviceInstance_fragment$data } from '@generated/serviceInstance_fragment.graphql';
import { SeoServiceInstanceItemFragment } from '@graphql/generated';
import Image from 'next/image';

// Component interface
interface ShareableResourceCarouselProps {
  images?: ReadonlyArray<{ readonly id: string } | null> | null;
  serviceInstance:
    SeoServiceInstanceItemFragment | serviceInstance_fragment$data;
  resource: AnalyticsResourceData;
  className?: string;
}

const ShareableResourceCarousel = ({
  images,
  serviceInstance,
  resource,
  className,
}: ShareableResourceCarouselProps) => {
  const t = useTranslate();
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
        <Carousel
          className={cn('h-[35vh]', className)}
          previousAnalyticsId="resource_previous_screenshot_open"
          nextAnalyticsId="resource_next_screenshot_open"
          slideAnalyticsId="resource_screenshot_select"
          previousLabel={t('DesignSystem.Carousel.Previous')}
          nextLabel={t('DesignSystem.Carousel.Next')}
          slideLabel={(slide) =>
            t('DesignSystem.Carousel.GoToSlide', { slide })
          }>
          {fileNames.map((name, index) => (
            <CarouselItem
              {...analyticsId('resource_screenshot_open')}
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
            <DialogContent
              {...analyticsResource(resource)}
              size="lg">
              <Carousel
                className="h-[80vh]"
                opts={{
                  startIndex: pictureIndex,
                }}
                previousAnalyticsId="resource_previous_screenshot_open"
                nextAnalyticsId="resource_next_screenshot_open"
                slideAnalyticsId="resource_screenshot_select"
                previousLabel={t('DesignSystem.Carousel.Previous')}
                nextLabel={t('DesignSystem.Carousel.Next')}
                slideLabel={(slide) =>
                  t('DesignSystem.Carousel.GoToSlide', { slide })
                }>
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
