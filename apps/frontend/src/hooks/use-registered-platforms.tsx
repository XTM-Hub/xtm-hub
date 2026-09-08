import { useRegisteredPlatformsFragment$key } from '@generated/useRegisteredPlatformsFragment.graphql';
import { useRegisteredPlatformsFragmentQuery } from '@generated/useRegisteredPlatformsFragmentQuery.graphql';
import { PlatformIdentifier } from '@graphql/generated';
import { graphql, useFragment, useLazyLoadQuery } from 'react-relay';

export const UseRegisteredPlatformsFragment = graphql`
  fragment useRegisteredPlatformsFragment on RegisteredPlatform {
    id
    version
    title
    url
    contract
  }
`;

export const UseRegisteredPlatformsQuery = graphql`
  query useRegisteredPlatformsFragmentQuery(
    $input: RegisteredPlatformsInput!
    $skip: Boolean!
  ) {
    registeredPlatforms(input: $input) @skip(if: $skip) {
      ...useRegisteredPlatformsFragment
    }
  }
`;

interface UseRegisteredPlatformsOptions {
  onlyActive?: boolean;
  /**
   * The registeredPlatforms query requires an authenticated user. Set to
   * true on public pages (anonymous visitors) to skip fetching it entirely.
   */
  skip?: boolean;
}

export const useRegisteredPlatforms = (
  platformIdentifier: PlatformIdentifier,
  options: UseRegisteredPlatformsOptions = {}
) => {
  const { onlyActive = false, skip = false } = options;
  const queryData = useLazyLoadQuery<useRegisteredPlatformsFragmentQuery>(
    UseRegisteredPlatformsQuery,
    {
      input: {
        identifier: platformIdentifier,
        onlyActive,
      },
      skip,
    }
  );
  const platforms = (queryData.registeredPlatforms ?? []).map((instanceRef) =>
    useFragment<useRegisteredPlatformsFragment$key>(
      UseRegisteredPlatformsFragment,
      instanceRef
    )
  );

  return {
    platforms,
  };
};
