import { describe, expect, it } from 'vitest';
import { getEntityTypeLabel } from './entity-type';

describe('getEntityTypeLabel', () => {
  it.each([
    ['Administrative-Area', 'Area'],
    ['Stix-Cyber-Observable', 'Observable'],
    ['Threat-Actor-Group', 'Threat Actor (Group)'],
    ['Security-Coverage', 'Security-Coverage'],
    ['', ''],
  ])('should label the %s entity type as %s', (entityType, expected) => {
    // Given / When
    const label = getEntityTypeLabel(entityType);

    // Then
    expect(label).toBe(expected);
  });
});
