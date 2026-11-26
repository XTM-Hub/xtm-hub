import { db, paginate } from '../../../knexfile';
import {
  EpicConnection,
  EpicCountPerTimeline,
  QueryEpicsArgs,
  Timeline,
} from '../../__generated__/resolvers-types';
import Epic, { EpicId, EpicMutator } from '../../model/kanel/public/Epic';
import { UserId } from '../../model/kanel/public/User';
import { SYSTEM_USER_UUID } from '../../portal.const';
import { UnknownErrorCode } from '../../utils/error/error.code';

export const EpicDomain = {
  reassignUserEpicsToSystemUser: async (userId: UserId): Promise<void> => {
    await db<Epic>('Epic')
      .where('uploader_id', '=', userId)
      .update({ uploader_id: SYSTEM_USER_UUID });

    await db<Epic>('Epic')
      .where('updater_id', '=', userId)
      .update({ updater_id: SYSTEM_USER_UUID });
  },
  loadEpics: async (
    opts: Partial<QueryEpicsArgs>,
    { includeInactive }: { includeInactive: boolean }
  ) => {
    const epicQuery = db<Epic>('Epic').select(['Epic.*']);
    if (!includeInactive) {
      epicQuery.where('Epic.active', true);
    }
    return paginate<Epic, EpicConnection>('Epic', opts, undefined, epicQuery);
  },
  loadEpicsBy: async (field: EpicMutator): Promise<Epic[]> => {
    return db<Epic>('Epic').where(field).select(['Epic.*']);
  },
  createEpic: async (input: Partial<Epic>): Promise<Epic> => {
    const [createdEpic] = await db<Epic>('Epic').insert(input).returning('*');
    if (!createdEpic) {
      throw new Error(UnknownErrorCode.EpicCreateError);
    }
    return createdEpic;
  },
  updateEpic: async (id: EpicId, input: EpicMutator): Promise<Epic> => {
    const [updated] = await db<Epic>('Epic')
      .where({ id })
      .update(input)
      .returning('*');
    if (!updated) {
      throw new Error(UnknownErrorCode.EpicUpdateError);
    }
    return updated;
  },
  deleteEpicBy: async (field: EpicMutator) => {
    await db<Epic>('Epic').where(field).delete();
  },
  countEpicsPerTimeline: async (): Promise<EpicCountPerTimeline[]> => {
    const rows = await db<Epic>('Epic')
      .whereNot({ timeline: Timeline.Finished })
      .where({ active: true })
      .groupBy('timeline')
      .select('timeline')
      .count<{ timeline: string; count: string }[]>({ count: '*' });
    return rows.map((row) => ({
      timeline: row.timeline as Timeline,
      count: Number(row.count ?? 0),
    }));
  },
};
