'use client';

import {
  type AnalyticsElementId,
  analyticsId,
} from '@/lib/analytics/analytics.ids';
import { MouseEvent, ReactNode, useCallback, useRef } from 'react';

interface DetailCardProps {
  onOpenDetail: () => void;
  analyticsId: AnalyticsElementId;
  title: string;
  description: string;
  media?: ReactNode;
  extra?: ReactNode;
  footer?: ReactNode;
}

export const DetailCard = ({
  onOpenDetail,
  analyticsId: elementId,
  title,
  description,
  media,
  extra,
  footer,
}: DetailCardProps) => {
  const titleRef = useRef<HTMLButtonElement>(null);
  const handleCardClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
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
    titleRef.current?.click();
  }, []);

  return (
    // eslint-disable-next-line no-restricted-syntax -- forwards its click to the tagged title button
    <div
      onClick={handleCardClick}
      className="group flex h-full flex-col overflow-hidden rounded layer-1 bg-elevation-default hover:cursor-pointer has-[h2>button:focus-visible]:ring-2 has-[h2>button:focus-visible]:ring-focus">
      {media}
      <div className="flex flex-1 flex-col gap-3 p-4 group-hover:bg-elevation-hover">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold line-clamp-2">
            <button
              {...analyticsId(elementId)}
              ref={titleRef}
              type="button"
              data-no-open-detail
              onClick={() => onOpenDetail()}
              className="text-left focus-visible:outline-none">
              {title}
            </button>
          </h2>
          <p className="text-default-secondary text-sm line-clamp-4 min-h-[5rem]">
            {description}
          </p>
          {extra}
        </div>
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </div>
  );
};
