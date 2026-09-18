'use client';

import MDEditor from '@uiw/react-md-editor';
import { cn } from '../../lib/utils';

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
