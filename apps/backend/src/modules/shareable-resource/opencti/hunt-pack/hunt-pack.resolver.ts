import {
  Resolvers,
  ShareableResource,
} from '../../../../__generated__/resolvers-types';
import { HuntPackHelper } from './hunt-pack.helper';

const parseHuntCount = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (value === '') return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
};

const resolvers: Resolvers = {
  OpenCTIHuntPack: {
    hunt_count: ({ hunt_count }) => parseHuntCount(hunt_count),
    attack_techniques: ({ attack_techniques }) =>
      HuntPackHelper.parseStringList(attack_techniques),
    hunt_platforms: ({ hunt_platforms }) =>
      HuntPackHelper.parseStringList(hunt_platforms),
    children_documents: async ({ id }, _, context) =>
      (await context.dataLoaders.document.imagesByDocumentIdLoader.load(
        id
      )) as unknown as ShareableResource[],
  },
};

export default resolvers;
