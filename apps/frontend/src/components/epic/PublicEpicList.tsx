import {
  EpicListQuery,
  epicsListFragment,
} from '@/components/epic/epic.graphql';
import { EpicList } from '@/components/epic/EpicList';
import { useEpicFilter } from '@/hooks/use-epic-filter';
import { EpicListContext } from '@/hooks/use-epic-list-context';
import { epic_fragment$data } from '@generated/epic_fragment.graphql';
import { epicsList_epics$key } from '@generated/epicsList_epics.graphql';
import { epicsQuery } from '@generated/epicsQuery.graphql';
import { seoServiceInstanceFragment$data } from '@generated/seoServiceInstanceFragment.graphql';
import {
  PreloadedQuery,
  usePreloadedQuery,
  useRefetchableFragment,
} from 'react-relay';

interface PublicEpicListProps {
  serviceInstance: seoServiceInstanceFragment$data;
  queryRef: PreloadedQuery<epicsQuery>;
}

const PublicEpicList = ({ queryRef, serviceInstance }: PublicEpicListProps) => {
  const queryData = usePreloadedQuery<epicsQuery>(EpicListQuery, queryRef);

  const [data, refetch] = useRefetchableFragment<
    epicsQuery,
    epicsList_epics$key
  >(epicsListFragment, queryData);

  const { selectedProducts, setSelectedProducts } = useEpicFilter();

  const epics = data.epics!.edges.map(
    (edge) => edge.node as epic_fragment$data
  );

  const handleSearch = (searchTerm: string) => {
    refetch({ searchTerm: searchTerm || undefined });
  };

  const connectionID = data.epics!.__id;
  return (
    <EpicListContext.Provider value={{ connectionID }}>
      <EpicList
        epics={epics}
        serviceInstance={serviceInstance}
        selectedProducts={selectedProducts}
        onFilterChange={setSelectedProducts}
        onSearch={handleSearch}
      />
    </EpicListContext.Provider>
  );
};

export default PublicEpicList;
