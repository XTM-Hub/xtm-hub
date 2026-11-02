import MDEditor from '@uiw/react-md-editor';
import { useTheme } from 'next-themes';
import type { CSSProperties, TextareaHTMLAttributes } from 'react';
import rehypeSanitize from 'rehype-sanitize';

// The editor and its toolbar both paint this library variable.
const editorStyle = {
  '--md-editor-background-color': 'var(--bg-input-default)',
  color: 'var(--text-default-primary)',
} as CSSProperties;

// Set by FormControl: the id ties the textarea to its FormLabel, otherwise the
// editor names it "Markdown editor".
type FormControlProps = Pick<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'aria-describedby' | 'aria-invalid'
>;

const MarkdownInput = ({
  value,
  onChange,
  placeholder,
  disabled,
  ...formControlProps
}: FormControlProps & {
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  disabled?: boolean;
}) => {
  const { theme } = useTheme();

  return (
    <div data-color-mode={theme}>
      <MDEditor
        value={value}
        onChange={onChange}
        highlightEnable={false}
        style={editorStyle}
        previewOptions={{
          rehypePlugins: [[rehypeSanitize]],
          style: {
            background: 'transparent',
            color: 'var(--text-default-primary)',
          },
        }}
        textareaProps={{
          ...formControlProps,
          placeholder,
          disabled,
          style: {
            background: 'transparent',
            color: 'var(--text-default-primary)',
          },
        }}
      />
    </div>
  );
};

export default MarkdownInput;
