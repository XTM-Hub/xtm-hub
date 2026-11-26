import { db } from '../../../../knexfile';
import ObjectUseCase, {
  ObjectUseCaseInitializer,
  ObjectUseCaseMutator,
} from '../../../model/kanel/public/ObjectUseCase';

export const objectUseCaseDomain = {
  insertObjectUseCase: async (
    initializer: ObjectUseCaseInitializer | ObjectUseCaseInitializer[]
  ) => {
    const initializers = Array.isArray(initializer)
      ? initializer
      : [initializer];
    const deduped = Array.from(
      new Map(
        initializers.map((item) => [
          `${item.object_id}:${item.use_case_id}`,
          item,
        ])
      ).values()
    );
    if (!deduped.length) {
      return;
    }
    await db<ObjectUseCase>('Object_UseCase').insert(deduped);
  },

  deleteObjectUseCaseBy: async (field: ObjectUseCaseMutator): Promise<void> => {
    await db<ObjectUseCase>('Object_UseCase').where(field).delete('*');
  },
};
