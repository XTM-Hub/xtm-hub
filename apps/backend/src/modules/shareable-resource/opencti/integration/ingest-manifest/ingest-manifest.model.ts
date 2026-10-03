import type { DocumentData } from '../../../../document/domain/document.domain';
import type { IntegrationCoverageDeclaration } from '../integration-coverage/integration-coverage.model';
import { Connector } from '../integration.model';

export interface ManifestInformation
  extends
    Partial<Connector>,
    Pick<DocumentData<Connector, string>, 'solution_categories'> {
  use_cases: string[];
  logo: string;
  /** Coverage declared by the contract; resolved into the covered_* metadata at ingestion. */
  coverage?: IntegrationCoverageDeclaration;
}
