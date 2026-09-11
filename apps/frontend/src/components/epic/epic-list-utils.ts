import { isWithinLastMonths } from '@/utils/date';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { FiligranProduct, Timeline } from '@graphql/generated';
import { useMemo } from 'react';
type Categories = 'draft' | Timeline;

const isRecentlyFinished = (epic: epic_fragment$data): boolean => {
  const referenceDate = epic.updated_at ?? epic.created_at;
  if (!referenceDate) return false;

  return isWithinLastMonths(referenceDate, 3);
};

export function useDraftAndTimelineEpics(epics: epic_fragment$data[]) {
  return useMemo(() => {
    const initial: Record<Categories, epic_fragment$data[]> = {
      draft: [],
      now: [],
      next: [],
      under_consideration: [],
      finished: [],
    };

    if (!epics) return initial;

    return epics.reduce((acc, item: epic_fragment$data) => {
      if (!item.active) acc.draft.push(item);
      else if (item.timeline === Timeline.Now) acc.now.push(item);
      else if (item.timeline === Timeline.Next) acc.next.push(item);
      else if (item.timeline === Timeline.UnderConsideration)
        acc.under_consideration.push(item);
      else if (item.timeline === Timeline.Finished && isRecentlyFinished(item))
        acc.finished.push(item);

      return acc;
    }, initial);
  }, [epics]);
}
export function useCountEpicsByProduct(
  epics: epic_fragment$data[],
  userCanUpdate: boolean,
  showFinished: boolean
): Record<FiligranProduct, number> {
  return useMemo(() => {
    const initial = Object.values(FiligranProduct).reduce(
      (acc, product) => {
        acc[product] = 0;
        return acc;
      },
      {} as Record<FiligranProduct, number>
    );

    if (!epics) return initial;

    const filteredEpics = epics.filter((epic) => {
      if (!userCanUpdate && !epic.active) return false;
      if (epic.timeline === Timeline.Finished) {
        return showFinished && isRecentlyFinished(epic);
      }
      return true;
    });

    return filteredEpics.reduce((acc, item) => {
      item.product.forEach((product) => {
        acc[product] += 1;
      });
      return acc;
    }, initial);
  }, [epics, userCanUpdate, showFinished]);
}
