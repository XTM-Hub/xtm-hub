// Encodes a content-translation key into an invisible, zero-width-character
// sequence appended to a translated string: the key travels inside the
// rendered text itself, invisible to the human eye but present in the DOM,
// so a global observer (see EditModeContentObserver) can scan any page,
// find which text came from which content-translation key, and make it
// clickable — without any per-string wrapping component.
const BIT_0 = '\u200B'; // zero width space
const BIT_1 = '\u200C'; // zero width non-joiner
const MARK_START = '\u2062'; // invisible times
const MARK_END = '\u2063'; // invisible separator

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const appendContentKeyMarker = (
  text: string,
  contentKey: string
): string => {
  const bytes = textEncoder.encode(contentKey);
  let bits = '';
  bytes.forEach((byte) => {
    bits += byte.toString(2).padStart(8, '0');
  });
  const encodedBits = bits.replace(/0/g, BIT_0).replace(/1/g, BIT_1);
  return `${text}${MARK_START}${encodedBits}${MARK_END}`;
};

const MARKER_PATTERN = new RegExp(
  `${MARK_START}([${BIT_0}${BIT_1}]+)${MARK_END}`
);

export interface DecodedContentKeyMarker {
  // The visible text, with every marker stripped out.
  cleanText: string;
  // The content-translation key encoded in the first marker found, or null
  // if `text` contains no marker at all.
  contentKey: string | null;
}

export const containsContentKeyMarker = (text: string): boolean =>
  text.includes(MARK_START);

// Only the first marker's key is returned: the expected shape is one t()
// call producing one text node with one marker.
export const decodeContentKeyMarker = (
  text: string
): DecodedContentKeyMarker => {
  const match = text.match(MARKER_PATTERN);
  let contentKey: string | null = null;

  if (match?.[1]) {
    const bits = match[1]
      .split('')
      .map((char) => (char === BIT_1 ? '1' : '0'))
      .join('');
    const byteCount = Math.floor(bits.length / 8);
    const bytes = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    try {
      contentKey = textDecoder.decode(bytes);
    } catch {
      contentKey = null;
    }
  }

  const cleanText = text.replace(
    new RegExp(`${MARK_START}[${BIT_0}${BIT_1}]+${MARK_END}`, 'g'),
    ''
  );

  return { cleanText, contentKey };
};
