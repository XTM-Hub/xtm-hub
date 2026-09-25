'use client';

import { cn } from '@/components/filigran-ui/lib/utils';
import MDEditor from '@uiw/react-md-editor';

interface MarkdownRendererProps {
  source: string;
  colorMode?: 'light' | 'dark';
  className?: string;
}

const MarkdownRenderer = ({
  source,
  colorMode = 'dark',
  className,
}: MarkdownRendererProps) => (
  <div
    data-color-mode={colorMode}
    className={cn(className)}>
    <MDEditor.Markdown
      source={source}
      style={{ backgroundColor: 'transparent' }}
    />
  </div>
);

export { MarkdownRenderer };
