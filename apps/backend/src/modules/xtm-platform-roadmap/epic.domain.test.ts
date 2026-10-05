import { afterEach, describe, expect, it } from 'vitest';
import { TestHelper } from '../../../tests/helper/test.helper';
import { TEST_ORGANIZATIONS } from '../../../tests/tests.const';
import {
  EpicOrdering,
  OrderingMode,
} from '../../__generated__/resolvers-types';
import { SYSTEM_USER_UUID } from '../../portal.const';
import { EpicDomain } from './epic.domain';

describe('epicDomain', () => {
  afterEach(async () => {
    await TestHelper.epic.delete({});
  });

  describe('loadEpics', () => {
    const pagination = {
      first: 10,
      orderBy: EpicOrdering.Title,
      orderMode: OrderingMode.Asc,
    };
    const createEpic = (title: string, active: boolean) =>
      TestHelper.epic.create({
        title,
        active,
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

    it('should return only active epics, and count only them, when inactive epics are excluded', async () => {
      // Given
      await createEpic('Active epic', true);
      await createEpic('Draft epic', false);

      // When
      const connection = await EpicDomain.loadEpics(pagination, {
        includeInactive: false,
      });

      // Then
      expect(connection.edges.map((edge) => edge.node.title)).toEqual([
        'Active epic',
      ]);
      expect(Number(connection.totalCount)).toBe(1);
    });

    it('should return active and inactive epics when inactive epics are included', async () => {
      // Given
      await createEpic('Active epic', true);
      await createEpic('Draft epic', false);

      // When
      const connection = await EpicDomain.loadEpics(pagination, {
        includeInactive: true,
      });

      // Then
      expect(connection.edges.map((edge) => edge.node.title)).toEqual([
        'Active epic',
        'Draft epic',
      ]);
      expect(Number(connection.totalCount)).toBe(2);
    });

    it('should not return an inactive epic that matches the search term when inactive epics are excluded', async () => {
      // Given
      await createEpic('Active roadmap epic', true);
      await createEpic('Draft roadmap epic', false);

      // When
      const connection = await EpicDomain.loadEpics(
        { ...pagination, searchTerm: 'roadmap' },
        { includeInactive: false }
      );

      // Then
      expect(connection.edges.map((edge) => edge.node.title)).toEqual([
        'Active roadmap epic',
      ]);
      expect(Number(connection.totalCount)).toBe(1);
    });

    it('should paginate over active epics only when inactive epics are excluded', async () => {
      // Given
      await createEpic('A active', true);
      await createEpic('B draft', false);
      await createEpic('C active', true);

      // When
      const connection = await EpicDomain.loadEpics(
        { ...pagination, first: 1 },
        { includeInactive: false }
      );

      // Then
      expect(connection.edges.map((edge) => edge.node.title)).toEqual([
        'A active',
      ]);
      expect(Number(connection.totalCount)).toBe(2);
      expect(connection.pageInfo.hasNextPage).toBe(true);
    });
  });

  describe('reassignUserEpicsToSystemUser', () => {
    it('should reassign uploader_id and updater_id of the user epics to the system user', async () => {
      const userId = TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID;
      const uploaded = await TestHelper.epic.create({
        title: 'reassign-uploaded',
        uploader_id: userId,
      });
      const updated = await TestHelper.epic.create({
        title: 'reassign-updated',
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        updater_id: userId,
      });

      await EpicDomain.reassignUserEpicsToSystemUser(userId);

      expect(await TestHelper.epic.load({ id: uploaded!.id })).toMatchObject({
        uploader_id: SYSTEM_USER_UUID,
      });
      expect(await TestHelper.epic.load({ id: updated!.id })).toMatchObject({
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
        updater_id: SYSTEM_USER_UUID,
      });
    });

    it('should leave epics of other users untouched', async () => {
      const otherEpic = await TestHelper.epic.create({
        title: 'reassign-other',
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });

      await EpicDomain.reassignUserEpicsToSystemUser(
        TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
      );

      expect(await TestHelper.epic.load({ id: otherEpic!.id })).toMatchObject({
        uploader_id: TEST_ORGANIZATIONS.FILIGRAN.USERS.BYPASS.ID,
      });
    });

    it('should not throw when the user has no epics', async () => {
      await expect(
        EpicDomain.reassignUserEpicsToSystemUser(
          TEST_ORGANIZATIONS.FILIGRAN.USERS.SIMPLE2.ID
        )
      ).resolves.toBeUndefined();
    });
  });
});
