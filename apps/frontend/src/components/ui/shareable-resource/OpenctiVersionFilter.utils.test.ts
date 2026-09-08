import { describe, expect, it } from 'vitest';
import {
  groupInstanceNamesByVersion,
  sortVersionsWithRegisteredFirst,
} from './OpenctiVersionFilter.utils';

describe('groupInstanceNamesByVersion', () => {
  it.each`
    description                                     | platforms                                                                                              | expected
    ${'no platforms'}                               | ${[]}                                                                                                  | ${[]}
    ${'a single instance for a version'}            | ${[{ version: '6.6.0', title: 'Production OpenCTI' }]}                                                 | ${[['6.6.0', ['Production OpenCTI']]]}
    ${'several instances sharing the same version'} | ${[{ version: '6.6.0', title: 'Production OpenCTI' }, { version: '6.6.0', title: 'Staging OpenCTI' }]} | ${[['6.6.0', ['Production OpenCTI', 'Staging OpenCTI']]]}
    ${'instances spread across different versions'} | ${[{ version: '6.6.0', title: 'Production OpenCTI' }, { version: '6.5.0', title: 'Staging OpenCTI' }]} | ${[['6.6.0', ['Production OpenCTI']], ['6.5.0', ['Staging OpenCTI']]]}
    ${'platforms without a version are ignored'}    | ${[{ version: null, title: 'Unversioned OpenCTI' }]}                                                   | ${[]}
  `('should group $description', ({ platforms, expected }) => {
    expect(groupInstanceNamesByVersion(platforms)).toEqual(new Map(expected));
  });
});

describe('sortVersionsWithRegisteredFirst', () => {
  it.each`
    description                                                             | versions                       | registeredVersions    | expected
    ${'no registered versions keeps the original (newest-first) order'}     | ${['6.6.0', '6.5.0', '6.4.0']} | ${[]}                 | ${['6.6.0', '6.5.0', '6.4.0']}
    ${'a single registered version is moved to the top'}                    | ${['6.6.0', '6.5.0', '6.4.0']} | ${['6.5.0']}          | ${['6.5.0', '6.6.0', '6.4.0']}
    ${'several registered versions keep their relative newest-first order'} | ${['6.6.0', '6.5.0', '6.4.0']} | ${['6.4.0', '6.6.0']} | ${['6.6.0', '6.4.0', '6.5.0']}
    ${'every version registered leaves the order unchanged'}                | ${['6.6.0', '6.5.0']}          | ${['6.6.0', '6.5.0']} | ${['6.6.0', '6.5.0']}
    ${'no versions returns an empty list'}                                  | ${[]}                          | ${['6.6.0']}          | ${[]}
  `(
    'should sort so that $description',
    ({ versions, registeredVersions, expected }) => {
      const registeredInstanceNamesByVersion = new Map(
        registeredVersions.map((version: string) => [version, ['Instance']])
      );

      expect(
        sortVersionsWithRegisteredFirst(
          versions,
          registeredInstanceNamesByVersion
        )
      ).toEqual(expected);
    }
  );
});
