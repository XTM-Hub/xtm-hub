'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import { CheckIndeterminateIcon } from '@filigran/icon';

export const Info = ({
  children = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis lobortis congue lacus, id aliquam lacus.',
}: {
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      'flex h-9 gap-x-2 rounded-md border border-input bg-background border-turquoise-200 text-default px-3 py-2 text-xs items-center'
    )}>
    <CheckIndeterminateIcon className={'size-4 text-turquoise-200'} />
    {children}
  </div>
);
