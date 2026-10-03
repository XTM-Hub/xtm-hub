import {
  CreateDocumentInput,
  DocumentMetadataKeyCode,
  IntegrationCoverageMatch,
  IntegrationCoverageSearchInput,
  IntegrationCoverageSearchResult,
  IntegrationType,
  LicenseType,
  UpdateDocumentInput,
} from '../../../../../__generated__/resolvers-types';
import type Document from '../../../../../model/kanel/public/Document';
import type { DocumentId } from '../../../../../model/kanel/public/Document';
import { logApp } from '../../../../../utils/app-logger.util';
import { TelemetryApp } from '../../../../telemetry/telemetry.app';
import { TelemetryEventType } from '../../../../telemetry/telemetry.types';
import { isIntegrationType } from '../integration.model';
import {
  CoverageCandidateRow,
  CoverageInferenceRow,
  IntegrationCoverageDomain,
} from './integration-coverage.domain';
import { IntegrationCoverageHelper } from './integration-coverage.helper';
import {
  COVERAGE_SEARCH_MAX_CANDIDATES,
  IntegrationCoverageDeclaration,
  StoredIntegrationCoverage,
} from './integration-coverage.model';
import {
  CoverageSearchRequest,
  IntegrationCoverageSearchHelper,
  RankedCoverageMatch,
} from './integration-coverage.search.helper';

const REFRESH_BATCH_SIZE = 200;

type RankedMatch = IntegrationCoverageMatch & RankedCoverageMatch;

type CoverageInput = Pick<
  CreateDocumentInput | UpdateDocumentInput,
  'covered_object_types' | 'covered_sectors' | 'covered_regions'
>;

const isLicenseType = (value: unknown): value is LicenseType =>
  (Object.values(LicenseType) as unknown[]).includes(value);

const toDeclaration = (
  input: CoverageInput
): IntegrationCoverageDeclaration => ({
  object_types: input.covered_object_types,
  sectors: input.covered_sectors,
  regions: input.covered_regions,
});

const toScoredMatch = (
  request: CoverageSearchRequest,
  candidate: CoverageCandidateRow
): Omit<RankedMatch, 'download_number'>[] => {
  const integrationType = candidate[DocumentMetadataKeyCode.IntegrationType];
  if (
    typeof integrationType !== 'string' ||
    !isIntegrationType(integrationType)
  ) {
    logApp.warn('[COVERAGE] Skipping integration with an unknown type', {
      documentId: candidate.id,
      integrationType,
    });
    return [];
  }
  if (!candidate.slug || !candidate.name) {
    return [];
  }

  const coverage: StoredIntegrationCoverage =
    IntegrationCoverageHelper.parseStoredCoverage(candidate) ?? {
      ...IntegrationCoverageHelper.emptyCoverage(),
      inferred: true,
    };
  const licenseType = candidate[DocumentMetadataKeyCode.LicenseType];
  // verified / manager_supported only exist on connectors
  const isConnector = integrationType === IntegrationType.Connector;

  return [
    {
      id: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      short_description: candidate.short_description,
      integration_type: integrationType,
      license_type: isLicenseType(licenseType) ? licenseType : null,
      verified: isConnector
        ? candidate[DocumentMetadataKeyCode.Verified] === true
        : null,
      manager_supported: isConnector
        ? candidate[DocumentMetadataKeyCode.ManagerSupported] === true
        : null,
      object_types: coverage.object_types,
      sectors: coverage.sectors,
      regions: coverage.regions,
      coverage_inferred: coverage.inferred,
      ...IntegrationCoverageSearchHelper.scoreCoverage(request, coverage),
    },
  ];
};

/** Download counts only matter to break score ties; ranking degrades gracefully without them. */
const loadDownloadCountsForTies = async (
  matches: Omit<RankedMatch, 'download_number'>[]
): Promise<Map<string, number>> => {
  const occurrencesByScore = new Map<number, number>();
  for (const { score } of matches) {
    occurrencesByScore.set(score, (occurrencesByScore.get(score) ?? 0) + 1);
  }
  const tiedIds = matches
    .filter(({ score }) => (occurrencesByScore.get(score) ?? 0) > 1)
    .map(({ id }) => id);
  if (tiedIds.length === 0) {
    return new Map();
  }
  try {
    return await TelemetryApp.countEventsByDocumentIds(
      TelemetryEventType.DOWNLOAD,
      tiedIds
    );
  } catch (error) {
    logApp.warn(
      '[COVERAGE] Unable to load download counts, ranking ties by name',
      { error }
    );
    return new Map();
  }
};

const toInferenceSourceFields = (
  document: Pick<Document, 'name' | 'short_description' | 'description'>
) => ({
  name: document.name,
  short_description: document.short_description,
  description: document.description,
});

/** Inferred coverage of every row whose stored inferred coverage is missing or outdated. */
const inferOutdatedCoverage = async (
  rows: CoverageInferenceRow[]
): Promise<
  Array<{ documentId: string; coverage: StoredIntegrationCoverage }>
> => {
  const documentIds = rows.map(({ id }) => id);
  const [useCaseNames, solutionCategoryNames] = await Promise.all([
    IntegrationCoverageDomain.loadUseCaseNamesByDocumentIds(documentIds),
    IntegrationCoverageDomain.loadSolutionCategoryNamesByDocumentIds(
      documentIds
    ),
  ]);
  return rows.flatMap((row) => {
    const inferred = IntegrationCoverageHelper.inferCoverage({
      ...toInferenceSourceFields(row),
      use_cases: useCaseNames.get(row.id),
      solution_categories: solutionCategoryNames.get(row.id),
    });
    const stored = IntegrationCoverageHelper.parseStoredCoverage(row);
    const isUpToDate =
      stored?.inferred === true &&
      IntegrationCoverageHelper.isSameCoverage(stored, inferred);
    return isUpToDate ? [] : [{ documentId: row.id, coverage: inferred }];
  });
};

export const IntegrationCoverageApp = {
  searchIntegrationsByCoverage: async (
    input: IntegrationCoverageSearchInput,
    { withFacets = true }: { withFacets?: boolean } = {}
  ): Promise<IntegrationCoverageSearchResult> => {
    const request = IntegrationCoverageSearchHelper.normalizeSearchInput(input);
    const hasRequestedFacets =
      IntegrationCoverageSearchHelper.hasRequestedFacets(request);

    const { candidates, facets, truncated } =
      await IntegrationCoverageDomain.loadCandidatesAndFacets(request, {
        withFacets,
      });
    if (truncated) {
      logApp.warn(
        '[COVERAGE] Coverage search truncated, the matches only rank the first candidates',
        { maxCandidates: COVERAGE_SEARCH_MAX_CANDIDATES }
      );
    }

    const scored = candidates
      .flatMap((candidate) => toScoredMatch(request, candidate))
      .filter((match) => !hasRequestedFacets || match.score > 0);
    const downloadCounts = await loadDownloadCountsForTies(scored);

    const matches = scored
      .map((match): RankedMatch => ({
        ...match,
        download_number: downloadCounts.get(match.id) ?? 0,
      }))
      .sort(IntegrationCoverageSearchHelper.compareRankedMatches)
      .slice(0, request.first)
      .map(({ download_number: _downloadNumber, ...match }) => match);

    return { matches, facets, truncated };
  },

  resolveCoverageForCreate: async (
    input: CreateDocumentInput
  ): Promise<StoredIntegrationCoverage> => {
    const declaration = toDeclaration(input);
    IntegrationCoverageHelper.assertValidDeclaration(declaration);

    // Same defensive reads as DocumentApp.createDocument: callers may omit the lists.
    const [useCaseNames, solutionCategoryNames] = await Promise.all([
      IntegrationCoverageDomain.loadUseCaseNamesByIds(input.use_cases ?? []),
      IntegrationCoverageDomain.loadSolutionCategoryNamesByIds(
        input.solution_categories ?? []
      ),
    ]);

    return IntegrationCoverageHelper.resolveAdminCoverage({
      input: declaration,
      existing: null,
      inferenceSource: {
        name: input.name,
        short_description: input.short_description,
        description: input.description,
        use_cases: useCaseNames,
        solution_categories: solutionCategoryNames,
      },
    });
  },

  resolveCoverageForUpdate: async ({
    documentId,
    currentDocument,
    input,
  }: {
    documentId: DocumentId;
    // Read under the document lock: the inference falls back to this text for the fields the update omits
    currentDocument: Pick<
      Document,
      'name' | 'short_description' | 'description'
    >;
    input: UpdateDocumentInput;
  }): Promise<StoredIntegrationCoverage> => {
    const declaration = toDeclaration(input);
    IntegrationCoverageHelper.assertValidDeclaration(declaration);

    // Mirrors DocumentApp.updateDocument: use cases are replaced whenever
    // provided, solution categories only when the list is not empty.
    const [existing, useCaseNames, solutionCategoryNames] = await Promise.all([
      IntegrationCoverageDomain.loadStoredCoverage(documentId),
      input.use_cases !== undefined
        ? IntegrationCoverageDomain.loadUseCaseNamesByIds(input.use_cases ?? [])
        : IntegrationCoverageDomain.loadUseCaseNamesByDocumentIds([
            documentId,
          ]).then((names) => names.get(documentId) ?? []),
      input.solution_categories?.length
        ? IntegrationCoverageDomain.loadSolutionCategoryNamesByIds(
            input.solution_categories
          )
        : IntegrationCoverageDomain.loadSolutionCategoryNamesByDocumentIds([
            documentId,
          ]).then((names) => names.get(documentId) ?? []),
    ]);

    return IntegrationCoverageHelper.resolveAdminCoverage({
      input: declaration,
      existing,
      inferenceSource: {
        name: input.name ?? currentDocument.name,
        short_description:
          input.short_description ?? currentDocument.short_description,
        description: input.description ?? currentDocument.description,
        use_cases: useCaseNames,
        solution_categories: solutionCategoryNames,
      },
    });
  },

  /**
   * Recomputes the inferred coverage of every integration without a declared
   * coverage, so existing documents and keyword table changes take effect
   * without a manual action. Idempotent; declared coverage is never touched.
   */
  refreshInferredCoverage: async (): Promise<{
    scanned: number;
    updated: number;
  }> => {
    let scanned = 0;
    let updated = 0;
    let afterId: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const rows =
        await IntegrationCoverageDomain.loadIntegrationsWithoutDeclaredCoverage(
          {
            afterId,
            limit: REFRESH_BATCH_SIZE,
          }
        );
      const candidates = await inferOutdatedCoverage(rows);
      const written = await IntegrationCoverageDomain.writeInferredCoverage(
        candidates.map(({ documentId }) => documentId),
        inferOutdatedCoverage
      );

      scanned += rows.length;
      updated += written;
      afterId = rows.at(-1)?.id;
      hasMore = rows.length === REFRESH_BATCH_SIZE;
    }

    logApp.info('[COVERAGE] Inferred integration coverage refreshed', {
      scanned,
      updated,
    });
    return { scanned, updated };
  },
};
