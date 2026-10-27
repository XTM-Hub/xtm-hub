import { useDocumentCounter } from '@/hooks/use-document-counter';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

interface DocumentCounterProps {
  documentId: string;
  documentCount: number | null | undefined;
}

const renderDocumentCounter = (initialProps: DocumentCounterProps) =>
  renderHook(
    ({ documentId, documentCount }: DocumentCounterProps) =>
      useDocumentCounter(documentId, documentCount),
    { initialProps }
  );

describe('useDocumentCounter', () => {
  it.each`
    documentCount | expected
    ${3}          | ${3}
    ${null}       | ${0}
    ${undefined}  | ${0}
  `(
    'should return $expected when the document count is $documentCount',
    ({ documentCount, expected }) => {
      // Given / When
      const { result } = renderDocumentCounter({
        documentId: 'document-1',
        documentCount,
      });

      // Then
      expect(result.current.count).toBe(expected);
    }
  );

  it('should follow the refreshed document count when the cached one is replaced', () => {
    // Given a cached count of 3
    const { result, rerender } = renderDocumentCounter({
      documentId: 'document-1',
      documentCount: 3,
    });

    // When the network returns 7
    rerender({ documentId: 'document-1', documentCount: 7 });

    // Then
    expect(result.current.count).toBe(7);
  });

  it('should increment from the refreshed count after a refresh', () => {
    // Given a cached count of 3 refreshed to 7
    const { result, rerender } = renderDocumentCounter({
      documentId: 'document-1',
      documentCount: 3,
    });
    rerender({ documentId: 'document-1', documentCount: 7 });

    // When an increment is acknowledged
    act(() => result.current.increment());

    // Then
    expect(result.current.count).toBe(8);
  });

  it.each`
    refresh                               | refreshedCount | expected
    ${'predates the local increment'}     | ${3}           | ${4}
    ${'already includes the increment'}   | ${4}           | ${4}
    ${"includes other users' increments"} | ${7}           | ${7}
  `(
    'should keep the acknowledged increment when a refresh $refresh',
    ({ refreshedCount, expected }) => {
      // Given an increment acknowledged on a count of 3
      const { result, rerender } = renderDocumentCounter({
        documentId: 'document-1',
        documentCount: 3,
      });
      act(() => result.current.increment());

      // When the document data is refreshed
      rerender({
        documentId: 'document-1',
        documentCount: refreshedCount,
      });

      // Then
      expect(result.current.count).toBe(expected);
    }
  );

  it('should reset the acknowledged increments when the document changes', () => {
    // Given an increment acknowledged on document-1
    const { result, rerender } = renderDocumentCounter({
      documentId: 'document-1',
      documentCount: 3,
    });
    act(() => result.current.increment());

    // When another document is displayed
    rerender({ documentId: 'document-2', documentCount: 1 });

    // Then
    expect(result.current.count).toBe(1);
  });
});
