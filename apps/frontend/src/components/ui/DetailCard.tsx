'use client';

import { MouseEvent, ReactNode, useCallback } from 'react';

interface DetailCardProps {
  onOpenDetail: () => void;
  title: string;
  description: string;
  media?: ReactNode;
  extra?: ReactNode;
  footer?: ReactNode;
}

export const DetailCard = ({
  onOpenDetail,
  title,
  description,
  media,
  extra,
  footer,
}: DetailCardProps) => {
  const handleCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const { currentTarget, target } = event;
      if (!(target instanceof Element)) {
        return;
      }
      if (!currentTarget.contains(target)) {
        return;
      }
      if (target.closest('[data-no-open-detail]')) {
        return;
      }
      onOpenDetail();
    },
    [onOpenDetail]
  );

  return (
    <div
      onClick={handleCardClick}
      className="group flex h-full flex-col overflow-hidden rounded bg-elevation-background-layer-1 hover:cursor-pointer">
      {media}
      <div className="flex flex-1 flex-col gap-m p-l group-hover:bg-hover">
        <div className="flex flex-col gap-m">
          <h2 className="text-base font-semibold line-clamp-2">
            <button
              type="button"
              data-no-open-detail
              onClick={() => onOpenDetail()}
              className="focus-visible:ring-primary text-left focus-visible:outline-none focus-visible:ring-2">
              {title}
            </button>
          </h2>
          <p className="text-muted-foreground text-sm line-clamp-4 min-h-[5rem]">
            {description}
          </p>
          {extra}
        </div>
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </div>
  );
};
