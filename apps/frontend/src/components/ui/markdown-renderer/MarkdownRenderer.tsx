'use client';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Text } from '@filigran/design-system';
import MDEditor from '@uiw/react-md-editor';
import type * as React from 'react';
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeSchema,
} from 'rehype-sanitize';

export interface MarkdownRendererProps {
  source: string;
  className?: string;
}

type MarkdownPreviewProps = React.ComponentProps<typeof MDEditor.Markdown>;
type MarkdownComponents = NonNullable<MarkdownPreviewProps['components']>;
type MarkdownRewrite = NonNullable<MarkdownPreviewProps['rehypeRewrite']>;
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type ElementProps<Tag extends keyof React.JSX.IntrinsicElements> =
  React.ComponentProps<Tag> & { node?: unknown };

const HEADING_VARIANTS = {
  h1: 'title-lg',
  h2: 'title-md',
  h3: 'title-sm',
  h4: 'title-xs',
  h5: 'title-xs',
  h6: 'title-xs',
} as const satisfies Record<HeadingTag, string>;

const HEADING_TAG = /^h[1-6]$/;
const TABLE_CELL_CLASSES = 'border border-elevation-subtle px-3 py-2 text-left';

// An attribute comment can set className as one string, which the default
// pattern checks as a whole: the class must be a single language token, or an
// author could smuggle utility classes past the sanitiser.
const SANITIZE_SCHEMA: SanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-\S+$/]],
  },
};

const REHYPE_PLUGINS: MarkdownPreviewProps['rehypePlugins'] = [
  [rehypeSanitize, SANITIZE_SCHEMA],
];

// The parser prepends a hash anchor to every heading with an id, which would
// otherwise show as an empty link next to the title. Only that generated anchor
// is aria-hidden, so an author link opening the heading stays.
const dropHeadingAnchor: MarkdownRewrite = (node) => {
  if (node.type !== 'element' || !HEADING_TAG.test(node.tagName)) {
    return;
  }
  const [firstChild] = node.children;
  if (
    firstChild?.type === 'element' &&
    firstChild.tagName === 'a' &&
    firstChild.properties?.ariaHidden === 'true'
  ) {
    node.children = node.children.slice(1);
  }
};

const createHeading = (tag: HeadingTag) => {
  const MarkdownHeading = ({
    node: _node,
    children,
    ...props
  }: ElementProps<HeadingTag>) => (
    <Text
      as={tag}
      variant={HEADING_VARIANTS[tag]}
      {...props}>
      {children}
    </Text>
  );
  MarkdownHeading.displayName = `MarkdownHeading(${tag})`;
  return MarkdownHeading;
};

const MARKDOWN_COMPONENTS: MarkdownComponents = {
  h1: createHeading('h1'),
  h2: createHeading('h2'),
  h3: createHeading('h3'),
  h4: createHeading('h4'),
  h5: createHeading('h5'),
  h6: createHeading('h6'),
  p: ({ node: _node, children, ...props }: ElementProps<'p'>) => (
    <Text
      variant="content-base"
      {...props}>
      {children}
    </Text>
  ),
  a: ({ node: _node, children, ...props }: ElementProps<'a'>) => (
    <Text
      as="a"
      variant="content-base-link"
      {...props}>
      {children}
    </Text>
  ),
  ul: ({ node: _node, className, ...props }: ElementProps<'ul'>) => (
    <ul
      className={cn('flex list-disc flex-col gap-1 pl-6', className)}
      {...props}
    />
  ),
  ol: ({ node: _node, className, ...props }: ElementProps<'ol'>) => (
    <ol
      className={cn('flex list-decimal flex-col gap-1 pl-6', className)}
      {...props}
    />
  ),
  li: ({ node: _node, children, className, ...props }: ElementProps<'li'>) => (
    <Text
      as="li"
      variant="content-base"
      className={cn(
        '[&>*+:is(p,ul,ol,pre,blockquote,table,div,details)]:mt-2 [&.task-list-item]:list-none',
        className
      )}
      {...props}>
      {children}
    </Text>
  ),
  blockquote: ({
    node: _node,
    className,
    ...props
  }: ElementProps<'blockquote'>) => (
    <blockquote
      className={cn(
        'flex flex-col gap-2 border-l-4 border-elevation-subtle pl-4 text-default-secondary',
        className
      )}
      {...props}
    />
  ),
  code: ({
    node: _node,
    children,
    className,
    ...props
  }: ElementProps<'code'>) => (
    <Text
      variant="content-code"
      className={cn('rounded-sm bg-elevation-highlight px-1', className)}
      {...props}>
      {children}
    </Text>
  ),
  pre: ({ node: _node, className, ...props }: ElementProps<'pre'>) => (
    <pre
      className={cn(
        'overflow-x-auto rounded-sm bg-elevation-highlight p-4 [&>code]:bg-transparent [&>code]:p-0',
        className
      )}
      {...props}
    />
  ),
  hr: ({ node: _node, ...props }: ElementProps<'hr'>) => (
    <Separator
      decorative={false}
      {...props}
    />
  ),
  table: ({ node: _node, className, ...props }: ElementProps<'table'>) => (
    <table
      className={cn('w-full border-collapse', className)}
      {...props}
    />
  ),
  th: ({ node: _node, children, className, ...props }: ElementProps<'th'>) => (
    <Text
      as="th"
      variant="content-base-bold"
      className={cn(TABLE_CELL_CLASSES, 'bg-elevation-highlight', className)}
      {...props}>
      {children}
    </Text>
  ),
  td: ({ node: _node, children, className, ...props }: ElementProps<'td'>) => (
    <Text
      as="td"
      variant="content-base"
      className={cn(TABLE_CELL_CLASSES, className)}
      {...props}>
      {children}
    </Text>
  ),
};

const MarkdownRenderer = ({ source, className }: MarkdownRendererProps) => (
  <MDEditor.Markdown
    source={source}
    prefixCls=""
    className={cn(
      'flex flex-col gap-3 break-words [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-sm [&>a]:self-start [&>img]:self-start',
      className
    )}
    disableCopy
    rehypePlugins={REHYPE_PLUGINS}
    rehypeRewrite={dropHeadingAnchor}
    components={MARKDOWN_COMPONENTS}
  />
);

export { MarkdownRenderer };
