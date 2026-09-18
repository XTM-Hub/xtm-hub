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

export function fixedForwardRef<T, P = {}>(
  render: (props: P, ref: Ref<T>) => ReactNode
): (props: P & RefAttributes<T>) => ReactNode {
  // @ts-ignore
  return forwardRef(render) as any;
}

export function uuid() {
  return crypto.getRandomValues(new Uint32Array(1))[0]!.toString();
}
