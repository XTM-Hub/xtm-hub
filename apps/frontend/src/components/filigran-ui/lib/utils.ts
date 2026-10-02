import { type ClassValue, clsx } from 'clsx';
import type { ReactElement, ReactNode, Ref, RefAttributes } from 'react';
import { Children, forwardRef, isValidElement } from 'react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getValidChildren(children: ReactNode) {
  return Children.toArray(children).filter((child) =>
    isValidElement(child)
  ) as ReactElement[];
}

export function fixedForwardRef<T, P = object>(
  render: (props: P, ref: Ref<T>) => ReactNode
): (props: P & RefAttributes<T>) => ReactNode {
  // @ts-expect-error - forwardRef cannot express an arbitrary generic props type
  return forwardRef(render) as unknown as (
    props: P & RefAttributes<T>
  ) => ReactNode;
}

export function uuid() {
  return crypto.getRandomValues(new Uint32Array(1))[0]!.toString();
}
