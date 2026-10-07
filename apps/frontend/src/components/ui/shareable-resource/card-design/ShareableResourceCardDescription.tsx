'use client';

import { Text } from '@filigran/design-system';

interface ShareableResourceCardDescriptionProps {
  description?: string | null;
}

export const ShareableResourceCardDescription = ({
  description,
}: ShareableResourceCardDescriptionProps) => {
  return (
    <Text
      as="p"
      variant="content-base"
      className="shrink-0 overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
      {description}
    </Text>
  );
};
