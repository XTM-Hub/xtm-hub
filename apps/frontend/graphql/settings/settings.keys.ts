import { useSettingsQuery } from '@graphql/generated';

export const settingsKeys = {
  all: useSettingsQuery.getRootKey,
  detail: () => useSettingsQuery.getKey(),
};
