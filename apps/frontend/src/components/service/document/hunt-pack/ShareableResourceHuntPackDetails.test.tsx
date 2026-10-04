import {
  HUNT_PACK_VISIBLE_TECHNIQUES,
  ShareableResourceHuntPackDetails,
} from '@/components/service/document/hunt-pack/ShareableResourceHuntPackDetails';
import testRender from '@/utils/test/test-render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

const techniques = (count: number) =>
  Array.from(
    { length: count },
    (_, index) => `T${String(1000 + index).padStart(4, '0')}`
  );

describe('ShareableResourceHuntPackDetails', () => {
  it('should display the hunt count, the hunted platforms and the techniques of the pack', () => {
    // Given a pack of 4 hunts on Splunk and Microsoft Sentinel
    testRender(
      <ShareableResourceHuntPackDetails
        huntPack={{
          hunt_count: 4,
          attack_techniques: ['T1059.001', 'T1071'],
          hunt_platforms: ['microsoft-sentinel', 'splunk'],
        }}
      />
    );

    // Then every row is shown with translated labels, never raw slugs
    expect(
      screen.getByText('Service.ShareableResources.Details.Hunts')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Service.ShareableResources.Details.HuntCount')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Service.OpenctiIntegrations.HuntPlatform.microsoft-sentinel, Service.OpenctiIntegrations.HuntPlatform.splunk'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('T1059.001')).toBeInTheDocument();
    expect(screen.getByText('T1071')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should fold a long technique list and expand it on demand', async () => {
    // Given a pack covering more techniques than the visible limit
    const user = userEvent.setup();
    const all = techniques(HUNT_PACK_VISIBLE_TECHNIQUES + 3);
    testRender(
      <ShareableResourceHuntPackDetails
        huntPack={{
          hunt_count: 20,
          attack_techniques: all,
          hunt_platforms: [],
        }}
      />
    );

    // Then only the first techniques are shown, with a button naming the rest
    expect(screen.getAllByRole('listitem')).toHaveLength(
      HUNT_PACK_VISIBLE_TECHNIQUES
    );
    const toggle = screen.getByRole('button', {
      name: 'Service.ShareableResources.Details.MoreItems',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // When the reader expands the list
    await user.click(toggle);

    // Then every technique is listed and the button folds it again
    expect(screen.getAllByRole('listitem')).toHaveLength(all.length);
    expect(
      screen.getByRole('button', {
        name: 'Service.ShareableResources.Details.ShowFewerItems',
      })
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('should not display empty rows', () => {
    // Given a pack whose file declares no technique and no native query
    testRender(
      <ShareableResourceHuntPackDetails
        huntPack={{
          hunt_count: null,
          attack_techniques: [],
          hunt_platforms: [],
        }}
      />
    );

    // Then no label is shown without a value
    expect(
      screen.queryByText('Service.ShareableResources.Details.Hunts')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.HuntedPlatforms')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Service.ShareableResources.Details.AttackTechniques')
    ).not.toBeInTheDocument();
  });
});
