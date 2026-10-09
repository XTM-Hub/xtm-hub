import { Label } from '@/components/ui/label';
import React from 'react';

interface ShareableResourceDetailItemProps {
  label: string;
  children: React.ReactNode;
}

export const ShareableResourceDetailItem = ({
  label,
  children,
}: ShareableResourceDetailItemProps) => {
  return (
    <div>
      <Label className="block pb-s">{label}</Label>
      {children}
    </div>
  );
};
