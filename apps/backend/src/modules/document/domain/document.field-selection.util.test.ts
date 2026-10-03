import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLResolveInfo,
  Kind,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';
import {
  getRequestedDocumentColumns,
  UnmappedDocumentFieldError,
} from './document.field-selection.util';

/**
 * Builds a minimal `GraphQLResolveInfo` stub from a real GraphQL query string,
 * parsed with `graphql`'s own `parse()`, so the walker under test is exercised
 * against exactly what Apollo would hand a resolver — not a hand-rolled AST.
 */
function buildResolveInfo(query: string): GraphQLResolveInfo {
  const document = parse(query);

  const fragments: Record<string, FragmentDefinitionNode> = {};
  let rootFieldNode: FieldNode | undefined;

  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    } else if (definition.kind === Kind.OPERATION_DEFINITION) {
      const [firstSelection] = definition.selectionSet.selections;
      if (firstSelection?.kind === Kind.FIELD) {
        rootFieldNode = firstSelection;
      }
    }
  }

  if (!rootFieldNode) {
    throw new Error('Test query must have a root field selection');
  }

  return {
    fieldNodes: [rootFieldNode],
    fragments,
  } as GraphQLResolveInfo;
}

describe('getRequestedDocumentColumns', () => {
  it('returns the minimal columns for a slug/created_at/updated_at selection, matching the dedicated lightweight query', () => {
    const info = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          slug
          created_at
          updated_at
        }
      }
    `);

    const columns = getRequestedDocumentColumns(info);

    expect(new Set(columns)).toEqual(
      new Set([
        'Document.id',
        'Document.type',
        'Document.slug',
        'Document.created_at',
        'Document.updated_at',
      ])
    );
  });

  it('covers every full-catalog field, including inline-fragment type-specific fields, without dropping data', () => {
    const info = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          id
          type
          name
          short_description
          description
          file_name
          active
          created_at
          updated_at
          updater_id
          slug
          service_instance_id
          uploader { id }
          uploader_organization { id }
          use_cases { id }
          children_documents { id }
          service_instance { id }
          subscription { id }
          ... on Integration {
            remover_id
            integration_type
            solution_categories { id }
            datasheet_url
          }
          ... on Connector {
            product_version
            container_image
          }
          ... on CustomView {
            entity_types
          }
        }
      }
    `);

    const columns = new Set(getRequestedDocumentColumns(info));

    // Every Document column reachable from this selection must be present.
    expect(columns).toEqual(
      new Set([
        'Document.id',
        'Document.type',
        'Document.name',
        'Document.short_description',
        'Document.description',
        'Document.file_name',
        'Document.active',
        'Document.created_at',
        'Document.updated_at',
        'Document.updater_id',
        'Document.slug',
        'Document.service_instance_id',
        'Document.remover_id',
      ])
    );

    // Metadata-backed fields (integration_type, product_version, container_image,
    // datasheet_url, entity_types) must NOT force extra raw columns: they're
    // hydrated separately by DocumentMetadataDomain.hydrateMetadata.
    expect(columns.has('Document.integration_type')).toBe(false);
    expect(columns.has('Document.product_version')).toBe(false);
    expect(columns.has('Document.entity_types')).toBe(false);
  });

  it('resolves fragment spreads the same as inlining their fields', () => {
    const inlineInfo = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          slug
        }
      }
    `);
    const spreadInfo = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          ...DocFields
        }
      }
      fragment DocFields on Document {
        slug
      }
    `);

    expect(new Set(getRequestedDocumentColumns(spreadInfo))).toEqual(
      new Set(getRequestedDocumentColumns(inlineInfo))
    );
  });

  it('throws UnmappedDocumentFieldError for a field with no registered column mapping, instead of silently dropping data', () => {
    const info = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          totallyUnknownField
        }
      }
    `);

    expect(() => getRequestedDocumentColumns(info)).toThrow(
      UnmappedDocumentFieldError
    );
  });

  it('ignores the __typename meta-field', () => {
    const info = buildResolveInfo(`
      query {
        publicDocumentsByServiceSlug(serviceInstanceSlug: "x") {
          __typename
          slug
        }
      }
    `);

    expect(new Set(getRequestedDocumentColumns(info))).toEqual(
      new Set(['Document.id', 'Document.type', 'Document.slug'])
    );
  });
});
