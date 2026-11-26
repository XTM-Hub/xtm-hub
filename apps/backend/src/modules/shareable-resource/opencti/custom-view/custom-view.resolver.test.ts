import { v4 as uuidv4 } from 'uuid';
import { describe, expect, it, vi } from 'vitest';
import {
  contextSimpleUserFiligran2,
  GRAPHQL_RESOLVE_INFO,
} from '../../../../../tests/tests.const';
import { CustomView } from '../../../../__generated__/resolvers-types';
import customViewResolver from './custom-view.resolver';

describe('customView field resolvers', () => {
  describe('customView.entity_types', () => {
    it('should parse entity types from the JSON metadata value', async () => {
      const expected = ['Attack-Pattern', 'Campaign'];

      const result = await customViewResolver.CustomView!.entity_types!(
        { entity_types: JSON.stringify(expected) } as unknown as CustomView,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(result).toEqual(expected);
    });

    it('should default to an empty array when the metadata is null', async () => {
      const result = await customViewResolver.CustomView!.entity_types!(
        { entity_types: null } as unknown as CustomView,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(result).toEqual([]);
    });

    it('should default to an empty array when the metadata value is malformed', async () => {
      const result = await customViewResolver.CustomView!.entity_types!(
        { entity_types: 'not-json' } as unknown as CustomView,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(result).toEqual([]);
    });
  });

  describe('customView.children_documents', () => {
    it('should load children images by document id', async () => {
      const documentId = uuidv4();
      const expected = [{ id: uuidv4() }];
      vi.spyOn(
        contextSimpleUserFiligran2.dataLoaders.document
          .imagesByDocumentIdLoader,
        'load'
      ).mockResolvedValue(
        expected as unknown as Awaited<
          ReturnType<
            typeof contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader.load
          >
        >
      );

      const result = await customViewResolver.CustomView!.children_documents!(
        { id: documentId } as unknown as CustomView,
        {},
        contextSimpleUserFiligran2,
        GRAPHQL_RESOLVE_INFO
      );

      expect(
        contextSimpleUserFiligran2.dataLoaders.document.imagesByDocumentIdLoader
          .load
      ).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(expected);
    });
  });
});
