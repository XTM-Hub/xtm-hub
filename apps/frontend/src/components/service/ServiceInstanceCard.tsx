'use client';

import { ResolvedServiceInstanceLink } from '@/components/service/service-instance-link.util';
import useScrollPosition from '@/hooks/use-scroll-position';
import { cn } from '@/lib/utils';
import { ArrowOutwardIcon, LogoFiligranIcon } from '@filigran/icon';
import { AspectRatio, Button } from '@filigran/ui/servers';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode, useCallback, useEffect } from 'react';

export type PlatformHoverAction = {
  id: string;
  label: string;
  href?: string;
  target?: string;
  variant?: 'secondary';
};

export interface ServiceInstanceCardData {
  id: string;
  isLinkDisabled?: boolean;
  name: string;
  slug?: string;
  logoBackgroundImageUrl: string | null;
  fullBackgroundImage?: boolean;
  illustrationDocumentUrl: string | null;
  isCustomIllustrationDocument?: boolean;
  card_background?: string | null;
  displayedServiceStatus?: string;
  displayLinkArrow?: boolean;
  disableCard?: boolean;
  cardTitleOverride?: string;
  description?: string;
  url: string;
  ordering: number;
  hoverLinks?: PlatformHoverAction[];
}

interface ServiceInstanceCardProps {
  serviceInstance: ServiceInstanceCardData;
  rightAction?: ReactNode;
  className?: string;
  link: ResolvedServiceInstanceLink;
}

const ServiceInstanceCard = ({
  serviceInstance,
  rightAction,
  className,
  link,
}: ServiceInstanceCardProps) => {
  const { reset } = useScrollPosition();
  const { href, target } = link;
  useEffect(() => {
    reset();
  }, [reset]);
  const renderHoverButton = useCallback((action: PlatformHoverAction) => {
    if (!action.href) {
      return null;
    }

    return (
      <Button
        key={action.id}
        {...(action.variant ? { variant: action.variant } : {})}>
        <Link
          href={action.href}
          prefetch={false}
          target={action.target}>
          {action.label}
        </Link>
      </Button>
    );
  }, []);

  return (
    <li className={cn('relative rounded flex', className)}>
      {serviceInstance.disableCard && (
        <div className="absolute inset-0  bg-elevation-background-layer-0 dark:bg-black/60 z-10 rounded pointer-events-none" />
      )}
      {serviceInstance.hoverLinks && (
        <div className="absolute inset-0 bg-elevation-background-layer-1 dark:bg-black/80 z-10 opacity-0 hover:opacity-100 flex">
          <div className="flex flex-col gap-s m-auto">
            {serviceInstance.hoverLinks?.map(renderHoverButton)}
          </div>
        </div>
      )}
      <div className="z-[2] flex-1 overflow-hidden relative group focus-within:ring-2 focus-within:ring-ring rounded flex flex-col">
        <div
          className={cn(
            'flex relative justify-center items-center flex-col gap-s overflow-hidden box-border px-s',
            serviceInstance.card_background ?? 'bg-blue-900'
          )}>
          <LogoFiligranIcon className="absolute opacity-[0.03] z-1 size-60 rotate-45 -translate-x-24 -translate-y-12" />
          <div className="mt-s flex items-center h-12 w-full">
            {serviceInstance.logoBackgroundImageUrl && (
              <div
                className={cn(
                  'h-12',
                  serviceInstance.displayedServiceStatus ? 'w-2/3' : 'w-full'
                )}
                style={{
                  backgroundImage: serviceInstance.logoBackgroundImageUrl,
                  backgroundSize: 'contain',
                  backgroundPosition: 'left center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
            {serviceInstance.displayedServiceStatus && (
              <span className="px-2 py-1 ml-auto rounded from-blue to-turquoise-300 bg-gradient-to-r border-none uppercase text-[11px]">
                {serviceInstance.displayedServiceStatus}
              </span>
            )}
          </div>
          <AspectRatio
            ratio={16 / 9}
            className={cn(
              'rounded-t',
              serviceInstance.fullBackgroundImage
                ? 'overflow-visible'
                : 'overflow-hidden'
            )}>
            {(serviceInstance.fullBackgroundImage && (
              <>
                <Image
                  width="580"
                  height="281"
                  src={serviceInstance.illustrationDocumentUrl!}
                  priority={false}
                  loading="lazy"
                  alt={`Illustration of ${serviceInstance.name}`}
                  className={
                    !serviceInstance.isCustomIllustrationDocument
                      ? 'absolute bottom-0 right-0 translate-y-1/4 translate-x-1/3 -rotate-45'
                      : ''
                  }
                  unoptimized={!!serviceInstance.isCustomIllustrationDocument}
                />
                <h3
                  className="text-2xl absolute bottom-0 -translate-y-10 left-0 w-full p-s max-w-[80%]"
                  style={{ textShadow: '1px 1px 1px #000' }}>
                  {serviceInstance.name}
                </h3>
              </>
            )) ||
              (serviceInstance.illustrationDocumentUrl && (
                <Image
                  fill
                  src={serviceInstance.illustrationDocumentUrl}
                  objectPosition="top"
                  objectFit="cover"
                  alt={`Illustration of ${serviceInstance.name}`}
                />
              ))}
          </AspectRatio>
        </div>
        <div className="min-h-40 flex flex-col p-l gap-l flex-1 bg-elevation-background-layer-1 group-hover:bg-hover">
          <div className="flex items-start min-h-12 w-full text-ellipsis overflow-hidden">
            {rightAction || serviceInstance.hoverLinks ? (
              <h2>
                {serviceInstance.cardTitleOverride || serviceInstance.name}
              </h2>
            ) : (
              <Link
                href={href}
                prefetch={false}
                target={target}
                rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                className="focus-visible:outline-none after:cursor-pointer after:content-[' '] after:absolute after:inset-0 z-0 aria-disabled:opacity-60 aria-disabled:after:hidden aria-disabled:cursor-auto"
                aria-disabled={serviceInstance.isLinkDisabled}>
                <h2>
                  {serviceInstance.cardTitleOverride || serviceInstance.name}
                </h2>
              </Link>
            )}

            <div className="flex pl-s ml-auto gap-m items-start">
              {serviceInstance.displayLinkArrow && (
                <div className="pt-2">
                  <ArrowOutwardIcon className="size-3 shrink-0" />
                </div>
              )}
            </div>
          </div>
          <p className="txt-sub-content text-muted-foreground">
            {serviceInstance.description}
          </p>
          {rightAction && (
            <div
              className="flex pt-s mt-auto ml-auto
          [&>button]:focus-visible:outline-none [&>button]:after:cursor-pointer [&>button]:after:content-[' '] [&>button]:after:absolute [&>button]:after:inset-0">
              {rightAction}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
export default ServiceInstanceCard;
