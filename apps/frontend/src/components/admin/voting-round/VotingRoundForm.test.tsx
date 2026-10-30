import VotingRoundForm from '@/components/admin/voting-round/VotingRoundForm';
import testRender from '@/utils/test/test-render';
import { screen, waitFor } from '@testing-library/react';

const SERVICE_INSTANCES = [{ id: 'instance-1', name: 'XTM Platform Roadmap' }];

type User = ReturnType<typeof testRender>['user'];

describe('VotingRoundForm', () => {
  describe('form validation', () => {
    it('should not submit when the name is too short', async () => {
      const handleSubmit = vi.fn();
      const { user } = testRender(
        <VotingRoundForm
          serviceInstances={SERVICE_INSTANCES}
          onClose={vi.fn()}
          handleSubmit={handleSubmit}
        />
      );

      await user.type(screen.getByLabelText(/VotingRound.Form.Name/i), 'a');
      await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

      await waitFor(() => {
        expect(handleSubmit).not.toHaveBeenCalled();
      });
    });

    it('should submit the name and description', async () => {
      const handleSubmit = vi.fn();
      const { user } = testRender(
        <VotingRoundForm
          serviceInstances={SERVICE_INSTANCES}
          onClose={vi.fn()}
          handleSubmit={handleSubmit}
        />
      );

      await user.type(
        screen.getByLabelText(/VotingRound.Form.Name/i),
        'Feature vote #2'
      );
      await user.type(
        screen.getByLabelText(/VotingRound.Form.Description/i),
        'Second round'
      );
      await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            service_instance_id: 'instance-1',
            name: 'Feature vote #2',
            description: 'Second round',
          }),
          expect.anything()
        );
      });
    });
  });

  describe('banner style', () => {
    it('should default a new round to the default identity', async () => {
      const handleSubmit = vi.fn();
      const { user } = testRender(
        <VotingRoundForm
          serviceInstances={SERVICE_INSTANCES}
          onClose={vi.fn()}
          handleSubmit={handleSubmit}
        />
      );

      await user.type(
        screen.getByLabelText(/VotingRound.Form.Name/i),
        'Feature vote #2'
      );
      await user.click(screen.getByRole('button', { name: /Utils.Validate/i }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ theme: 'default' }),
          expect.anything()
        );
      });
    });

    it('should prefill the identity of the edited round', () => {
      testRender(
        <VotingRoundForm
          votingRound={{
            id: 'round-1',
            service_instance_id: 'instance-1',
            name: 'Feature vote #1',
            theme: 'thread',
          }}
          onClose={vi.fn()}
          handleDelete={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      expect(screen.getByLabelText('VotingRound.Form.Theme')).toHaveTextContent(
        'VotingRound.Theme.thread'
      );
    });
  });

  describe('actions', () => {
    it('should prefill the values of the edited round', () => {
      testRender(
        <VotingRoundForm
          votingRound={{
            id: 'round-1',
            service_instance_id: 'instance-1',
            name: 'Feature vote #1',
            description: 'First round',
          }}
          onClose={vi.fn()}
          handleDelete={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      expect(screen.getByDisplayValue('Feature vote #1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('First round')).toBeInTheDocument();
    });

    it('should call onClose when cancelling', async () => {
      const onClose = vi.fn();
      const { user } = testRender(
        <VotingRoundForm
          onClose={onClose}
          handleSubmit={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /Utils.Cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call handleDelete after confirming the deletion', async () => {
      const handleDelete = vi.fn();
      const { user } = testRender(
        <VotingRoundForm
          votingRound={{
            id: 'round-1',
            service_instance_id: 'instance-1',
            name: 'Feature vote #1',
          }}
          onClose={vi.fn()}
          handleDelete={handleDelete}
          handleSubmit={vi.fn()}
        />
      );

      await user.click(
        screen.getByRole('button', { name: /^MenuActions.Delete$/i })
      );
      await user.click(
        screen.getByRole('button', { name: /^MenuActions.Delete$/i })
      );

      expect(handleDelete).toHaveBeenCalledTimes(1);
    });

    it('should not offer the copy-features field when editing an existing round', () => {
      testRender(
        <VotingRoundForm
          votingRound={{
            id: 'round-1',
            service_instance_id: 'instance-1',
            name: 'Feature vote #1',
          }}
          copySources={[{ id: 'round-0', name: 'Feature vote #0' }]}
          onClose={vi.fn()}
          handleDelete={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      expect(
        screen.queryByLabelText(/VotingRound.Form.CopyFeaturesFrom/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('copy-features field', () => {
    const COPY_SOURCE = { id: 'round-0', name: 'Feature vote #0' };
    const NEW_ROUND_NAME = 'Feature vote #2';

    const renderNewRound = (handleSubmit = vi.fn()) => ({
      handleSubmit,
      ...testRender(
        <VotingRoundForm
          serviceInstances={SERVICE_INSTANCES}
          copySources={[COPY_SOURCE]}
          onClose={vi.fn()}
          handleSubmit={handleSubmit}
        />
      ),
    });

    const pickCopySource = async (user: User, optionName: string) => {
      await user.click(
        screen.getByRole('combobox', {
          name: 'VotingRound.Form.CopyFeaturesFrom',
        })
      );
      await user.click(await screen.findByRole('option', { name: optionName }));
    };

    it('should copy the features of the round the admin picks', async () => {
      // Given
      const { user, handleSubmit } = renderNewRound();
      await user.type(
        screen.getByLabelText(/VotingRound.Form.Name/i),
        NEW_ROUND_NAME
      );

      // When
      await pickCopySource(user, COPY_SOURCE.name);
      await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

      // Then
      await waitFor(() =>
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            copy_features_from_round_id: COPY_SOURCE.id,
          }),
          expect.anything()
        )
      );
    });

    it('should copy no feature when the admin switches back to none', async () => {
      // Given
      const { user, handleSubmit } = renderNewRound();
      await user.type(
        screen.getByLabelText(/VotingRound.Form.Name/i),
        NEW_ROUND_NAME
      );
      await pickCopySource(user, COPY_SOURCE.name);

      // When
      await pickCopySource(user, 'VotingRound.Form.CopyFeaturesNone');
      await user.click(screen.getByRole('button', { name: 'Utils.Validate' }));

      // Then
      await waitFor(() =>
        expect(handleSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ copy_features_from_round_id: undefined }),
          expect.anything()
        )
      );
    });
  });
});
