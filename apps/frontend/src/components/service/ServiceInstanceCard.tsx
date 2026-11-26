'use client';

import { ResolvedServiceInstanceLink } from '@/components/service/service-instance-link.util';
import useScrollPosition from '@/hooks/use-scroll-position';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import { cn } from '@/lib/utils';
import { ArrowOutwardIcon, LogoFiligranIcon } from '@filigran/icon';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode, useEffect } from 'react';

export interface ServiceInstanceCardData {
  id: string;
  isLinkDisabled?: boolean;
  name: string;
  slug?: string;
  logoBackgroundImageUrl: string | null;
  illustrationDocumentUrl: string | null;
  displayLinkArrow?: boolean;
  description?: string;
  url: string;
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

  return (
    <li className={cn('relative rounded flex', className)}>
      <div className="z-[2] flex-1 overflow-hidden relative group focus-within:ring-2 focus-within:ring-focus rounded flex flex-col">
        <div className="flex relative justify-center items-center flex-col gap-2 overflow-hidden box-border px-2 bg-[var(--blue-900)]">
          <LogoFiligranIcon className="absolute opacity-[0.03] z-1 size-60 rotate-45 -translate-x-24 -translate-y-12" />
          <div className="mt-2 flex items-center h-12 w-full">
            {serviceInstance.logoBackgroundImageUrl && (
              <div
                className="h-12 w-full"
                style={{
                  backgroundImage: serviceInstance.logoBackgroundImageUrl,
                  backgroundSize: 'contain',
                  backgroundPosition: 'left center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>
          <div className="relative w-full min-h-0 aspect-video rounded-t overflow-hidden">
            {serviceInstance.illustrationDocumentUrl && (
              <Image
                fill
                src={serviceInstance.illustrationDocumentUrl}
                objectPosition="top"
                objectFit="cover"
                alt={`Illustration of ${serviceInstance.name}`}
              />
            )}
          </div>
        </div>
        <div className="min-h-40 flex flex-col p-4 gap-4 flex-1 layer-1 bg-elevation-default group-hover:bg-elevation-hover">
          <div className="flex items-start min-h-12 w-full text-ellipsis overflow-hidden">
            {rightAction ? (
              <h2>{serviceInstance.name}</h2>
            ) : (
              <Link
                {...analyticsId('resource_library_open')}
                href={href}
                prefetch={false}
                target={target}
                rel={target === '_blank' ? 'noopener noreferrer' : undefined}
                className="focus-visible:outline-none after:cursor-pointer after:content-[' '] after:absolute after:inset-0 z-0 aria-disabled:opacity-60 aria-disabled:after:hidden aria-disabled:cursor-auto"
                aria-disabled={serviceInstance.isLinkDisabled}>
                <h2>{serviceInstance.name}</h2>
              </Link>
            )}

            <div className="flex pl-2 ml-auto gap-3 items-start">
              {serviceInstance.displayLinkArrow && (
                <div className="pt-2">
                  <ArrowOutwardIcon className="size-3 shrink-0" />
                </div>
              )}
            </div>
          </div>
          <p className="content-compact text-default-secondary">
            {serviceInstance.description}
          </p>
          {rightAction && (
            <div
              className="flex pt-2 mt-auto ml-auto
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
