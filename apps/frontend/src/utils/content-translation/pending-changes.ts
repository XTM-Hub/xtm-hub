// A change is one edited text: its drafts span up to one row per locale.
export const countPendingChanges = (drafts: { key: string }[]): number =>
  new Set(drafts.map(({ key }) => key)).size;
