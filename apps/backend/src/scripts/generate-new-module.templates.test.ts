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
    it('should build the Pascal case and the query name when the module name is kebab-case', () => {
      expect(toPascalCase('review-widget')).toBe('ReviewWidget');
      expect(toQueryName('review-widget')).toBe('reviewWidgetList');
    });

    it('should reject the name when it has no letter or digit', () => {
      expect(() => toPascalCase('--')).toThrow();
    });
  });

  describe('resolver', () => {
    it('should declare one admin-only guarded query and spread its class when the module has no scalar', () => {
      const resolver = resolverTemplate('review-widget', false);

      expect(resolver).toContain('class ReviewWidgetQueries {');
      expect(resolver).toContain('@Guarded(bypassOnlyGuard())');
      expect(resolver).toContain(
        "static readonly reviewWidgetList: NonNullable<QueryResolvers['reviewWidgetList']>"
      );
      expect(resolver).toContain('Query: { ...ReviewWidgetQueries },');
      expect(resolver).not.toContain('createRelayIdScalar');
      expect(resolver).not.toContain('ReviewWidgetId');
    });

    it('should declare and import the ID type when the module has a scalar', () => {
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
    it('should run the access matrix on the query when the test is generated', () => {
      const test = testTemplate('review-widget');

      expect(test).toContain('TestHelper.expectAccessMatrix({');
      expect(test).toContain("operation: '{ reviewWidgetList { id } }'");
      expect(test).toContain(
        "guarded: () => vi.spyOn(ReviewWidgetDomain, 'loadAll')"
      );
      expect(test).toContain(
        'anonymous: UnauthenticatedErrorCode.Unauthenticated'
      );
      expect(test).toContain('user: ForbiddenErrorCode.ForbiddenAccess');
      expect(test).toContain("admin: 'allowed'");
    });
  });

  describe('graphql', () => {
    it('should declare the query, and the scalar only when it is asked', () => {
      const withScalar = graphQLTemplate('review-widget', true);
      const withoutScalar = graphQLTemplate('review-widget', false);

      expect(withScalar).toContain('scalar ReviewWidgetId');
      expect(withoutScalar).not.toContain('scalar ReviewWidgetId');
      expect(withScalar).toContain('reviewWidgetList: [ReviewWidget!]!');
    });
  });

  describe('app and domain', () => {
    it('should generate the app, its test and the domain loader when the module is scaffolded', () => {
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
