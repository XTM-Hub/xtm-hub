import { describe, expect, it } from 'vitest';
import { containsContentKeyMarker } from './invisible-marker';
import { withContentKeyMarkers } from './with-content-key-markers';

describe('withContentKeyMarkers', () => {
  it('should leave non-string results untouched', () => {
    // Given
    const richResult = { type: 'span' };
    const t = withContentKeyMarkers(() => richResult, 'Namespace');

    // When
    const result = t();

    // Then
    expect(result).toBe(richResult);
  });

  it('should keep translator helpers such as has working', () => {
    // Given
    const translator = Object.assign(() => 'Hello', { has: () => true });
    const t = withContentKeyMarkers(translator, 'Namespace');

    // When
    const hasKey = t.has();

    // Then
    expect(hasKey).toBe(true);
  });

  it('should mark string results', () => {
    // Given
    const t = withContentKeyMarkers((key: string) => `Value of ${key}`);

    // When
    const result = t('Title');

    // Then
    expect(containsContentKeyMarker(result)).toBe(true);
  });
});
