import testRender from '@/utils/test/test-render';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

const HEADING_TEXT = 'Section title';
const PARAGRAPH_TEXT = 'A plain paragraph';
const STRONG_TEXT = 'important';
const DELETED_TEXT = 'outdated';
const LINK_TEXT = 'Filigran';
const LINK_HREF = 'https://filigran.io/';
const LOGO_ALT = 'Filigran logo';
const PARAGRAPH_CLASS = 'text-content-base';
const LINK_CLASS = 'text-content-base-link';
const CODE_CLASS = 'text-content-code';
const TASK_ITEM_CLASS = 'task-list-item';
const TASK_ITEM_NO_MARKER_CLASS = '[&.task-list-item]:list-none';
const FIRST_ITEM = 'First item';
const SECOND_ITEM = 'Second item';
const INLINE_CODE = 'yarn install';
const BLOCK_CODE = 'const answer = 42;';
const HEADER_CELL = 'Name';
const BODY_CELL = 'OpenCTI';
const TEXT_BEFORE = 'Before';
const TEXT_AFTER = 'After';
const STYLED_TEXT = 'styled';
const UNSAFE_LINK_TEXT = 'unsafe link';
const CALLER_PADDING_CLASS = 'p-6';
const CALLER_GAP_CLASS = 'gap-4';
const DEFAULT_GAP_CLASS = 'gap-3';
const QUOTE_TEXT = 'Quoted words';
const QUOTE_CLASS = 'text-default-secondary';
const IMAGE_SRC = 'x.png';
const LANGUAGE_CLASS = 'language-ts';
const SMUGGLED_CLASSES = ['fixed', 'inset-0', 'z-50'];

describe('MarkdownRenderer', () => {
  it.each([
    [1, 'text-title-lg', '#'],
    [2, 'text-title-md', '##'],
    [3, 'text-title-sm', '###'],
    [4, 'text-title-xs', '####'],
    [5, 'text-title-xs', '#####'],
    [6, 'text-title-xs', '######'],
  ])(
    'should render an h%i with the %s class when the heading marker is "%s"',
    (level, variantClass, marker) => {
      // Given
      const source = `${marker} ${HEADING_TEXT}`;

      // When
      testRender(<MarkdownRenderer source={source} />);

      // Then
      const heading = screen.getByRole('heading', { level });
      expect(heading).toHaveTextContent(HEADING_TEXT);
      expect(heading.tagName).toBe(`H${level}`);
      expect(heading).toHaveClass(variantClass);
    }
  );

  it('should render the strong text and the link inside a paragraph when the source holds inline markup', () => {
    // Given
    const source = `${PARAGRAPH_TEXT} with **${STRONG_TEXT}** and [${LINK_TEXT}](${LINK_HREF}).`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(screen.getByText(STRONG_TEXT).tagName).toBe('STRONG');
    expect(screen.getByText(STRONG_TEXT).closest('p')).toHaveClass(
      PARAGRAPH_CLASS
    );
    const link = screen.getByRole('link', { name: LINK_TEXT });
    expect(link).toHaveAttribute('href', LINK_HREF);
    expect(link).toHaveClass(LINK_CLASS);
  });

  it('should render a del when the source holds a GFM strikethrough', () => {
    // Given
    const source = `~~${DELETED_TEXT}~~`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(screen.getByText(DELETED_TEXT).tagName).toBe('DEL');
  });

  it.each([
    ['bullet', 'list-disc', '-'],
    ['numbered', 'list-decimal', '1.'],
  ])(
    'should render a %s list with %s when the items start with "%s"',
    (_kind, listClass, marker) => {
      // Given
      const source = `${marker} ${FIRST_ITEM}\n${marker} ${SECOND_ITEM}`;

      // When
      testRender(<MarkdownRenderer source={source} />);

      // Then
      const list = screen.getByRole('list');
      expect(list).toHaveClass(listClass);
      expect(
        within(list)
          .getAllByRole('listitem')
          .map((item) => item.textContent)
      ).toEqual([FIRST_ITEM, SECOND_ITEM]);
    }
  );

  it('should keep the checkboxes and drop the item marker when the source holds a task list', () => {
    // Given
    const source = `- [x] ${FIRST_ITEM}\n- [ ] ${SECOND_ITEM}`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    const [done, todo] = screen.getAllByRole('checkbox');
    expect(done).toBeChecked();
    expect(todo).not.toBeChecked();
    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toHaveClass(TASK_ITEM_CLASS, TASK_ITEM_NO_MARKER_CLASS);
    }
  });

  it('should render inline code and a pre block when the source holds backticks and a fence', () => {
    // Given
    const source = `Run \`${INLINE_CODE}\`.\n\n\`\`\`js\n${BLOCK_CODE}\n\`\`\``;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    const inlineCode = screen.getByText(INLINE_CODE);
    expect(inlineCode.tagName).toBe('CODE');
    expect(inlineCode).toHaveClass(CODE_CLASS);
    const pre = container.querySelector('pre');
    expect(pre).toHaveTextContent(BLOCK_CODE);
    expect(pre?.querySelector('code')).toHaveClass(CODE_CLASS);
  });

  it('should render only the code inside the pre when the source holds a fenced block', () => {
    // Given
    const source = `\`\`\`\n${BLOCK_CODE}\n\`\`\``;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    const pre = container.querySelector('pre');
    expect(pre?.children).toHaveLength(1);
    expect(pre?.firstElementChild?.tagName).toBe('CODE');
  });

  it('should render a blockquote in the secondary text colour when the source holds a quote', () => {
    // Given
    const source = `> ${QUOTE_TEXT}`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(screen.getByText(QUOTE_TEXT).closest('blockquote')).toHaveClass(
      QUOTE_CLASS
    );
  });

  it('should expose a separator when the source holds a thematic break', () => {
    // Given
    const source = `${TEXT_BEFORE}\n\n---\n\n${TEXT_AFTER}`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('should expose a table with header and body cells when the source holds a GFM table', () => {
    // Given
    const source = `| ${HEADER_CELL} |\n| --- |\n| ${BODY_CELL} |`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    const table = screen.getByRole('table');
    expect(
      within(table).getByRole('columnheader', { name: HEADER_CELL })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole('cell', { name: BODY_CELL })
    ).toBeInTheDocument();
  });

  it('should render no anchor link inside a heading when the heading is plain text', () => {
    // Given
    const source = `## ${HEADING_TEXT}`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    const heading = screen.getByRole('heading', { level: 2 });
    expect(
      within(heading).queryByRole('link', { hidden: true })
    ).not.toBeInTheDocument();
  });

  it('should keep the author link when a heading starts with it', () => {
    // Given
    const source = `## [![${LOGO_ALT}](logo.png)](${LINK_HREF})`;

    // When
    testRender(<MarkdownRenderer source={source} />);

    // Then
    const heading = screen.getByRole('heading', { level: 2 });
    expect(
      within(heading).getByRole('link', { name: LOGO_ALT })
    ).toHaveAttribute('href', LINK_HREF);
  });

  it('should drop the script and keep the text around it when the source holds a raw script', () => {
    // Given
    const source = `${TEXT_BEFORE}\n\n<script>alert(1)</script>\n\n${TEXT_AFTER}`;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText(TEXT_BEFORE)).toBeInTheDocument();
    expect(screen.getByText(TEXT_AFTER)).toBeInTheDocument();
  });

  it('should drop the attribute and keep the text around it when the source holds an event attribute', () => {
    // Given
    const source = `${TEXT_BEFORE} <img src="${IMAGE_SRC}" alt="" onerror="alert(1)"> ${TEXT_AFTER}`;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', IMAGE_SRC);
    expect(image).not.toHaveAttribute('onerror');
    expect(container).toHaveTextContent(`${TEXT_BEFORE} ${TEXT_AFTER}`);
  });

  it('should drop the author classes on code when an attribute comment sets them', () => {
    // Given
    const source = `\`${INLINE_CODE}\`<!--rehype:className=language-x ${SMUGGLED_CLASSES.join(' ')}-->\n\n\`\`\`ts\n${BLOCK_CODE}\n\`\`\``;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    const inlineCode = screen.getByText(INLINE_CODE);
    expect(inlineCode).toHaveClass(CODE_CLASS);
    for (const smuggledClass of SMUGGLED_CLASSES) {
      expect(inlineCode).not.toHaveClass(smuggledClass);
    }
    expect(container.querySelector('pre code')).toHaveClass(LANGUAGE_CLASS);
  });

  it('should drop the attribute and keep the text when the source holds a raw style attribute', () => {
    // Given
    const source = `${TEXT_BEFORE} <span style="color: red">${STYLED_TEXT}</span> ${TEXT_AFTER}`;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(container.querySelector('[style]')).not.toBeInTheDocument();
    expect(container).toHaveTextContent(
      `${TEXT_BEFORE} ${STYLED_TEXT} ${TEXT_AFTER}`
    );
  });

  it('should drop the URL and keep the link text when the source holds a javascript link', () => {
    // Given
    const source = `${TEXT_BEFORE} [${UNSAFE_LINK_TEXT}](javascript:alert(1)) ${TEXT_AFTER}`;

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(container.querySelector('[href^="javascript:"]')).toBeNull();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container).toHaveTextContent(
      `${TEXT_BEFORE} ${UNSAFE_LINK_TEXT} ${TEXT_AFTER}`
    );
  });

  it('should merge the caller classes on the root when a className is given', () => {
    // Given
    const source = PARAGRAPH_TEXT;

    // When
    const { container } = testRender(
      <MarkdownRenderer
        source={source}
        className={`${CALLER_PADDING_CLASS} ${CALLER_GAP_CLASS}`}
      />
    );

    // Then
    const root = container.firstElementChild;
    expect(root).toHaveClass(
      CALLER_PADDING_CLASS,
      CALLER_GAP_CLASS,
      'flex',
      'flex-col'
    );
    expect(root).not.toHaveClass(DEFAULT_GAP_CLASS);
  });

  it('should render an empty root when the source is empty', () => {
    // Given
    const source = '';

    // When
    const { container } = testRender(<MarkdownRenderer source={source} />);

    // Then
    expect(container.firstElementChild).toBeEmptyDOMElement();
  });
});
