import { v4 as uuidv4 } from 'uuid';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../../tests/helper/test.helper';
import { ObjectUseCaseObjectId } from '../../../model/kanel/public/ObjectUseCase';
import { objectUseCaseDomain } from './object-use-case.domain';

describe('objectUseCaseDomain', () => {
  describe('insertObjectUseCase', () => {
    beforeEach(async () => {
      await TestHelper.objectUseCase.delete({});
      await TestHelper.useCase.delete({});
    });

    it('should insert a single link', async () => {
      const objectId = uuidv4() as ObjectUseCaseObjectId;
      const useCase = await TestHelper.useCase.create({
        name: 'Test UseCase',
        color: '#0099cc',
      });

      await objectUseCaseDomain.insertObjectUseCase({
        object_id: objectId,
        use_case_id: useCase.id,
      });

      const links = await TestHelper.objectUseCase.load({
        object_id: objectId,
      });
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({
        object_id: objectId,
        use_case_id: useCase.id,
      });
    });

    it('should not fail and should deduplicate when the same (object_id, use_case_id) pair is provided twice', async () => {
      const objectId = uuidv4() as ObjectUseCaseObjectId;
      const useCase = await TestHelper.useCase.create({
        name: 'Test UseCase',
        color: '#0099cc',
      });

      await objectUseCaseDomain.insertObjectUseCase([
        { object_id: objectId, use_case_id: useCase.id },
        { object_id: objectId, use_case_id: useCase.id },
      ]);

      const links = await TestHelper.objectUseCase.load({
        object_id: objectId,
      });
      expect(links).toHaveLength(1);
    });

    it('should do nothing when given an empty array', async () => {
      await expect(
        objectUseCaseDomain.insertObjectUseCase([])
      ).resolves.not.toThrow();
    });
  });
});
