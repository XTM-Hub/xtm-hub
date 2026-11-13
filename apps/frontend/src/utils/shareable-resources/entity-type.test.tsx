import testRender from '@/utils/test/test-render';
import { describe, expect, it } from 'vitest';
import {
  EntityTypeIcon,
  EntityTypeOrFiligranLogo,
  getEntityTypeLabel,
} from './entity-type';

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

describe('EntityTypeIcon', () => {
  it.each(['Malware', 'Security-Coverage'])(
    'should hide the %s icon from assistive technology by default',
    (entityType) => {
      // Given / When
      const { container } = testRender(
        <EntityTypeIcon entityType={entityType} />
      );

      // Then
      expect(container.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    }
  );

  it('should let a caller name the icon when it is used on its own', () => {
    // Given / When
    const { container } = testRender(
      <EntityTypeIcon
        entityType="Malware"
        aria-hidden={false}
        aria-label="Malware"
      />
    );

    // Then
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-label',
      'Malware'
    );
    expect(container.querySelector('svg')).not.toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });
});

describe('EntityTypeOrFiligranLogo', () => {
  it.each([[['Malware']], [[]], [undefined]])(
    'should hide the logo from assistive technology for entity types %j',
    (entityTypes) => {
      // Given / When
      const { container } = testRender(
        <EntityTypeOrFiligranLogo entityTypes={entityTypes} />
      );

      // Then
      expect(container.querySelector('svg')).toHaveAttribute(
        'aria-hidden',
        'true'
      );
    }
  );
});
