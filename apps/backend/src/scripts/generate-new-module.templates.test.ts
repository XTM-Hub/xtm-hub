import { describe, expect, it } from 'vitest';
import {
  appTemplate,
  appTestTemplate,
  domainTemplate,
  graphQLTemplate,
  resolverTemplate,
  testTemplate,
  toPascalCase,
  toQueryName,
} from './generate-new-module.templates';

describe('generate-new-module templates', () => {
  describe('names', () => {
    it('builds the Pascal case and the query name from a kebab-case module', () => {
      expect(toPascalCase('review-widget')).toBe('ReviewWidget');
      expect(toQueryName('review-widget')).toBe('reviewWidgetList');
    });

    it('rejects a name without letters or digits', () => {
      expect(() => toPascalCase('--')).toThrow();
    });
  });

  describe('resolver', () => {
    it('declares one admin-only guarded query and spreads its class', () => {
      const resolver = resolverTemplate('review-widget', false);

      expect(resolver).toContain('class ReviewWidgetQueries {');
      expect(resolver).toContain(
        '@Guarded(portalCapabilityGuard([PortalCapability.Bypass]))'
      );
      expect(resolver).toContain(
        "static readonly reviewWidgetList: NonNullable<QueryResolvers['reviewWidgetList']>"
      );
      expect(resolver).toContain('Query: { ...ReviewWidgetQueries },');
      expect(resolver).not.toContain('createRelayIdScalar');
      expect(resolver).not.toContain('ReviewWidgetId');
    });

    it('declares and imports the ID type when the module has a scalar', () => {
      const resolver = resolverTemplate('review-widget', true);

      expect(resolver).toContain(
        "import { ReviewWidgetId } from '../../model/kanel/public/ReviewWidget';"
      );
      expect(resolver).toContain(
        "import { createRelayIdScalar } from '../../utils/scalar.util';"
      );
      expect(resolver).toContain(
        "ReviewWidgetId: createRelayIdScalar<ReviewWidgetId>('ReviewWidget'),"
      );
    });
  });

  describe('test', () => {
    it('runs the access matrix on the generated query', () => {
      const test = testTemplate('review-widget');

      expect(test).toContain('TestHelper.expectAccessMatrix({');
      expect(test).toContain("operation: '{ reviewWidgetList { id } }'");
      expect(test).toContain(
        "guarded: () => vi.spyOn(ReviewWidgetDomain, 'loadAll')"
      );
      expect(test).toContain('anonymous: ErrorType.Unauthenticated');
      expect(test).toContain('user: ErrorType.ForbiddenAccess');
      expect(test).toContain("admin: 'allowed'");
    });
  });

  describe('graphql', () => {
    it('declares the query, and the scalar only when asked', () => {
      const withScalar = graphQLTemplate('review-widget', true);
      const withoutScalar = graphQLTemplate('review-widget', false);

      expect(withScalar).toContain('scalar ReviewWidgetId');
      expect(withoutScalar).not.toContain('scalar ReviewWidgetId');
      expect(withScalar).toContain('reviewWidgetList: [ReviewWidget!]!');
    });
  });

  describe('app and domain', () => {
    it('generates the app, its test and the domain loader', () => {
      expect(appTemplate('review-widget')).toContain(
        'export const ReviewWidgetApp = {};'
      );
      expect(appTestTemplate('review-widget')).toContain(
        "import { ReviewWidgetApp } from './review-widget.app';"
      );
      expect(domainTemplate('review-widget')).toContain(
        'loadAll: (): Promise<ReviewWidget[]>'
      );
    });
  });
});
