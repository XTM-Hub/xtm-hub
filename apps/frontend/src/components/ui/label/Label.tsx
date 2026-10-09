import { Text } from '@filigran/design-system';
import * as React from 'react';

export interface LabelProps extends React.ComponentPropsWithoutRef<'label'> {
  children: React.ReactNode;
  error?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, className, error = false, ...props }, ref) => (
    <Text
      ref={ref}
      as="label"
      variant="content-compact-medium"
      // Joined, not merged: only the design system's merge config tells these colours from its size class.
      className={[error ? 'text-input-error' : 'text-input-label', className]
        .filter(Boolean)
        .join(' ')}
      {...props}>
      {children}
    </Text>
  )
);
Label.displayName = 'Label';

export { Label };
