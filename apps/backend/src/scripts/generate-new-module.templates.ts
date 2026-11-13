export const resolverTemplate = (
  resolverName: string,
  needScalarId: boolean
) => {
  const pascal = toPascalCase(resolverName);
  const query = toQueryName(resolverName);
  return `import {
  PortalCapability,
  QueryResolvers,
  Resolvers,
} from '../../__generated__/resolvers-types';
import { Guarded } from '../../security/guarded/guarded.decorator';
import { portalCapabilityGuard } from '../../security/guarded/guards/portal.guard';
${needScalarId ? `import { ${pascal}Id } from '../../model/kanel/public/${pascal}';\nimport { createRelayIdScalar } from '../../utils/scalar.util';\n` : ''}import { ${pascal}Domain } from './${resolverName}.domain';

// Every operation declares its access: @Public() or @Guarded(guard), never a bare resolver.
// Admin-only by default, widen it on purpose.
class ${pascal}Queries {
  @Guarded(portalCapabilityGuard([PortalCapability.Bypass]))
  static readonly ${query}: NonNullable<QueryResolvers['${query}']> = () =>
    ${pascal}Domain.loadAll();
}

const resolvers: Resolvers = {
  ${needScalarId ? `${pascal}Id: createRelayIdScalar<${pascal}Id>('${pascal}'),\n  ` : ''}
  Query: { ...${pascal}Queries },
  Mutation: {
  },
};
  
export default resolvers;
`;
};

export const testTemplate = (resolverName: string) => {
  const pascal = toPascalCase(resolverName);
  const query = toQueryName(resolverName);
  return `import { describe, expect, it, vi } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { ErrorType } from '../../utils/error/error.type';
import { ${pascal}Domain } from './${resolverName}.domain';
import resolver from './${resolverName}.resolver';

describe('${resolverName}.resolver', () => {
  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});

describe('${query} query', () => {
  TestHelper.expectAccessMatrix({
    operation: '{ ${query} { id } }',
    guarded: () => vi.spyOn(${pascal}Domain, 'loadAll'),
    expected: {
      anonymous: ErrorType.Unauthenticated,
      user: ErrorType.ForbiddenAccess,
      admin: 'allowed',
    },
    prepare: () =>
      Promise.resolve({
        variables: {},
        expectedData: { ${query}: [] },
        cleanup: () => Promise.resolve(),
      }),
  });
});
`;
};

export const appTemplate = (resolverName: string) => {
  const appIdentifier = `${toPascalCase(resolverName)}App`;
  return `export const ${appIdentifier} = {};
`;
};

export const appTestTemplate = (resolverName: string) => {
  const appIdentifier = `${toPascalCase(resolverName)}App`;
  return `import { describe, expect, it } from 'vitest';
import { ${appIdentifier} } from './${resolverName}.app';

describe('${resolverName}.app', () => {
  it('should be defined', () => {
    expect(${appIdentifier}).toBeDefined();
  });
});
`;
};

export const domainTemplate = (resolverName: string) => {
  const pascal = toPascalCase(resolverName);
  return `import { ${pascal} } from '../../__generated__/resolvers-types';

export const ${pascal}Domain = {
  loadAll: (): Promise<${pascal}[]> => Promise.resolve([]),
};
`;
};

export const graphQLTemplate = (
  resolverName: string,
  needScalarId: boolean
) => {
  return `
  ${
    needScalarId
      ? `scalar ${toPascalCase(resolverName)}Id
  `
      : ''
  }

  type ${toPascalCase(resolverName)} implements Node {
    id: ID!
  }

  type Query {
    ${toQueryName(resolverName)}: [${toPascalCase(resolverName)}!]!
  }
  `;
};

export const toPascalCase = (value: string) => {
  const normalized = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join('');

  if (!normalized) {
    throw new Error('Le nom du resolver est invalide.');
  }

  return normalized;
};

export const toQueryName = (value: string) => {
  const pascal = toPascalCase(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}List`;
};
