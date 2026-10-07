import VotableFeatureForm from '@/components/admin/voting-round/VotableFeatureForm';
import testRender from '@/utils/test/test-render';
import { FiligranProduct } from '@graphql/generated';
import { screen } from '@testing-library/react';

vi.mock('@/components/admin/use-case/use-use-cases', () => ({
  useUseCases: () => [
    { id: 'use-case-1', name: 'Threat hunting', color: '#001122' },
  ],
}));

const buildFeature = () => ({
  id: 'feature-1',
  title: 'AI-powered report triage',
  short_description: 'Automatically extract entities.',
  description: 'Long **markdown** description',
  product: FiligranProduct.Opencti,
  use_cases: [{ id: 'use-case-1', name: 'Threat hunting' }],
  illustration_document_id: 'document-1',
  position: 2,
  active: true,
});

describe('VotableFeatureForm', () => {
  describe('product field', () => {
    it('should only offer the votable products when picking the product of a feature', async () => {
      // Given
      const { user } = testRender(
        <VotableFeatureForm
          serviceInstanceId="instance-1"
          onClose={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      // When
      await user.click(
        screen.getByRole('combobox', { name: 'VotingRound.Feature.Product' })
      );

      // Then
      expect(
        screen.getAllByRole('option').map((option) => option.textContent)
      ).toEqual(['OPENCTI', 'OPENAEV', 'XTMONE', 'XTMHUB']);
    });
  });

  describe('illustration field', () => {
    it('should preview the current illustration and hide it once removed', async () => {
      const { user } = testRender(
        <VotableFeatureForm
          feature={buildFeature()}
          serviceInstanceId="instance-1"
          onClose={vi.fn()}
          handleDelete={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      const removeButton = screen.getByRole('button', {
        name: 'VotingRound.Feature.RemoveIllustration',
      });
      expect(removeButton).toBeInTheDocument();

      await user.click(removeButton);

      expect(
        screen.queryByRole('button', {
          name: 'VotingRound.Feature.RemoveIllustration',
        })
      ).not.toBeInTheDocument();
    });

    it('should not show the remove button when there is no illustration', () => {
      testRender(
        <VotableFeatureForm
          serviceInstanceId="instance-1"
          onClose={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      expect(
        screen.queryByRole('button', {
          name: 'VotingRound.Feature.RemoveIllustration',
        })
      ).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should prefill the edited feature values', () => {
      testRender(
        <VotableFeatureForm
          feature={buildFeature()}
          serviceInstanceId="instance-1"
          onClose={vi.fn()}
          handleDelete={vi.fn()}
          handleSubmit={vi.fn()}
        />
      );

      expect(
        screen.getByDisplayValue('AI-powered report triage')
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      expect(screen.getByLabelText('VotingRound.Feature.Active')).toBeChecked();
    });

    it('should call onClose when cancelling', async () => {
      const onClose = vi.fn();
      const { user } = testRender(
        <VotableFeatureForm
          serviceInstanceId="instance-1"
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
        <VotableFeatureForm
          feature={buildFeature()}
          serviceInstanceId="instance-1"
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
  });
});
