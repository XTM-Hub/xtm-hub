import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';

const resolverTemplate = (resolverName: string, needScalarId: boolean) => {
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

const testTemplate = (resolverName: string) => {
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

const appTemplate = (resolverName: string) => {
  const appIdentifier = `${toPascalCase(resolverName)}App`;
  return `export const ${appIdentifier} = {};
`;
};

const appTestTemplate = (resolverName: string) => {
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

const domainTemplate = (resolverName: string) => {
  const pascal = toPascalCase(resolverName);
  return `import { ${pascal} } from '../../__generated__/resolvers-types';

export const ${pascal}Domain = {
  loadAll: (): Promise<${pascal}[]> => Promise.resolve([]),
};
`;
};

const graphQLTemplate = (resolverName: string, needScalarId: boolean) => {
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

const schemaFilePath = path.resolve(
  process.cwd(),
  'src/server/graphql-schema.ts'
);
const codegenFilePath = path.resolve(process.cwd(), 'codegen.yml');

const toPascalCase = (value: string) => {
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

const toQueryName = (value: string) => {
  const pascal = toPascalCase(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}List`;
};

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const toResolverIdentifier = (resolverName: string) => {
  const pascal = toPascalCase(resolverName);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}Resolver`;
};

const updateGraphqlSchema = async (
  resolverIdentifier: string,
  importPath: string
) => {
  const schemaContent = await readFile(schemaFilePath, 'utf-8');
  let nextSchemaContent = schemaContent;

  const importLine = `import ${resolverIdentifier} from '${importPath}';`;
  if (!nextSchemaContent.includes(importLine)) {
    const importAnchor =
      "import { authDirectiveTransformer } from '../security/directive-graphql/directive-auth';";

    if (!nextSchemaContent.includes(importAnchor)) {
      throw new Error(
        `Insertion impossible, ancre import introuvable dans ${schemaFilePath}`
      );
    }

    nextSchemaContent = nextSchemaContent.replace(
      importAnchor,
      `${importLine}\n${importAnchor}`
    );
  }

  const resolverLine = `  ${resolverIdentifier},`;
  if (!nextSchemaContent.includes(resolverLine)) {
    const resolversAnchor = 'const resolvers = mergeResolvers([\n';

    if (!nextSchemaContent.includes(resolversAnchor)) {
      throw new Error(
        `Insertion impossible, tableau mergeResolvers introuvable dans ${schemaFilePath}`
      );
    }

    nextSchemaContent = nextSchemaContent.replace(
      resolversAnchor,
      `${resolversAnchor}${resolverLine}\n`
    );
  }

  if (nextSchemaContent !== schemaContent) {
    await writeFile(schemaFilePath, nextSchemaContent, 'utf-8');
  }
};

const updateCodegenScalar = async (
  scalarName: string,
  scalarTypeName: string
) => {
  const codegenContent = await readFile(codegenFilePath, 'utf-8');
  let nextCodegenContent = codegenContent;

  const scalarLine = `        ${scalarName}: "../model/kanel/public/${scalarTypeName}.js#${scalarName}"`;
  if (!nextCodegenContent.includes(scalarLine)) {
    const scalarsAnchor = '      scalars:\n';

    if (!nextCodegenContent.includes(scalarsAnchor)) {
      throw new Error(
        `Insertion impossible, section scalars introuvable dans ${codegenFilePath}`
      );
    }

    nextCodegenContent = nextCodegenContent.replace(
      scalarsAnchor,
      `${scalarsAnchor}${scalarLine}\n`
    );
  }

  if (nextCodegenContent !== codegenContent) {
    await writeFile(codegenFilePath, nextCodegenContent, 'utf-8');
  }
};

const createResolverFiles = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const input = await rl.question("Module's name: ");
    const resolverName = input.trim();

    if (!resolverName) {
      throw new Error("Module's name is mandatory");
    }

    const needScalarIdInput = await rl.question('Need scalar? (y/n): ');
    const needScalarId = needScalarIdInput.trim().toLowerCase() === 'y';

    const moduleFolderPath = path.resolve(
      process.cwd(),
      'src/modules',
      resolverName
    );
    const resolverFilePath = path.join(
      moduleFolderPath,
      `${resolverName}.resolver.ts`
    );
    const resolverTestFilePath = path.resolve(
      moduleFolderPath,
      `${resolverName}.resolver.test.ts`
    );
    const graphQLFilePath = path.resolve(
      moduleFolderPath,
      `${resolverName}.graphql`
    );
    const appFilePath = path.resolve(
      moduleFolderPath,
      `${resolverName}.app.ts`
    );
    const appTestFilePath = path.resolve(
      moduleFolderPath,
      `${resolverName}.app.test.ts`
    );
    const domainFilePath = path.resolve(
      moduleFolderPath,
      `${resolverName}.domain.ts`
    );
    const filesToCreate = [
      {
        filePath: resolverFilePath,
        content: resolverTemplate(resolverName, needScalarId),
      },
      {
        filePath: resolverTestFilePath,
        content: testTemplate(resolverName),
      },
      {
        filePath: graphQLFilePath,
        content: graphQLTemplate(resolverName, needScalarId),
      },
      {
        filePath: appFilePath,
        content: appTemplate(resolverName),
      },
      {
        filePath: appTestFilePath,
        content: appTestTemplate(resolverName),
      },
      {
        filePath: domainFilePath,
        content: domainTemplate(resolverName),
      },
    ];

    for (const { filePath } of filesToCreate) {
      if (await fileExists(filePath)) {
        throw new Error(`Le fichier existe deja: ${filePath}`);
      }
    }

    await mkdir(moduleFolderPath, { recursive: true });

    for (const { filePath, content } of filesToCreate) {
      await writeFile(filePath, content, 'utf-8');
    }

    const resolverIdentifier = toResolverIdentifier(resolverName);
    const resolverImportPath = `../modules/${resolverName}/${resolverName}.resolver`;
    await updateGraphqlSchema(resolverIdentifier, resolverImportPath);
    if (needScalarId) {
      const scalarTypeName = toPascalCase(resolverName);
      const scalarName = `${scalarTypeName}Id`;
      await updateCodegenScalar(scalarName, scalarTypeName);
    }

    const createdFiles = filesToCreate
      .map(({ filePath }) => `- ${filePath}`)
      .join('\n');
    process.stdout.write(
      `Fichiers crees:\n${createdFiles}\nResolver ajoute dans ${schemaFilePath}\nScalar ajoute dans ${codegenFilePath}\n`
    );
  } finally {
    rl.close();
  }
};

createResolverFiles().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${errorMessage}\n`);
  process.exitCode = 1;
});
