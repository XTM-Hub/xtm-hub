import { publicResourcePath } from '@/utils/path/public-resource-path';
import { describe, expect, it } from 'vitest';

describe('publicResourcePath', () => {
  it('should join the public path, the service slug and the resource slug without leading slash', () => {
    // Given / When
    const path = publicResourcePath('opencti-integrations', 'my-connector');

    // Then
    expect(path).toBe(
      'cybersecurity-solutions/opencti-integrations/my-connector'
    );
  });

  it('should be usable behind a locale or a base url', () => {
    // Given
    const path = publicResourcePath('opencti-playbooks', 'my-playbook');

    // When / Then
    expect(`/en/${path}`).toBe(
      '/en/cybersecurity-solutions/opencti-playbooks/my-playbook'
    );
    expect(`https://hub.filigran.io/${path}`).toBe(
      'https://hub.filigran.io/cybersecurity-solutions/opencti-playbooks/my-playbook'
    );
  });
});
