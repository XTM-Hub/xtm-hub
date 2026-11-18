import { ProfileApiTokens } from '@/components/profile/api-tokens/ProfileApiTokens';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  ApiTokenCreateMutationVariables,
  ApiTokenRevokeMutationVariables,
  ApiTokenRowFragment,
  ApiTokenScope,
} from '@graphql/generated';
import { screen, waitFor, within } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

const DAY_MS = 24 * 60 * 60 * 1000;

const activeToken: ApiTokenRowFragment = {
  __typename: 'ApiToken',
  id: 'token-active',
  name: 'Filigran Copilot',
  token_prefix: 'xhp_abcdef',
  scope: ApiTokenScope.ReadWrite,
  organization_id: 'org-test-456',
  organization_name: 'Test Organization',
  expires_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
  last_used_at: null,
  created_at: new Date(Date.now() - DAY_MS).toISOString(),
  revoked_at: null,
};

const revokedToken: ApiTokenRowFragment = {
  ...activeToken,
  id: 'token-revoked',
  name: 'Old script',
  revoked_at: new Date(Date.now() - DAY_MS).toISOString(),
};

const serveTokens = (tokens: ApiTokenRowFragment[]) =>
  mswServer.use(
    graphql.query('ApiTokens', () =>
      HttpResponse.json({ data: { apiTokens: tokens } })
    )
  );

describe('ProfileApiTokens', () => {
  it('should explain the empty list', async () => {
    serveTokens([]);

    testRender(<ProfileApiTokens />);

    expect(await screen.findByText('ApiTokens.Empty')).toBeInTheDocument();
  });

  it('should list the tokens with their prefix and offer revoke on active ones only', async () => {
    serveTokens([revokedToken, activeToken]);

    testRender(<ProfileApiTokens />);

    expect(await screen.findByText('Filigran Copilot')).toBeInTheDocument();
    expect(screen.getByText('Old script')).toBeInTheDocument();
    expect(screen.getAllByText('xhp_abcdef…')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: 'ApiTokens.RevokeNamed' })
    ).toHaveLength(1);
  });

  it('should revoke a token after confirmation', async () => {
    serveTokens([activeToken]);
    let revoked: ApiTokenRevokeMutationVariables | undefined;
    mswServer.use(
      graphql.mutation('ApiTokenRevoke', ({ variables }) => {
        revoked = variables as ApiTokenRevokeMutationVariables;
        return HttpResponse.json({
          data: {
            revokeApiToken: {
              ...activeToken,
              revoked_at: new Date().toISOString(),
            },
          },
        });
      })
    );

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.RevokeNamed' })
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'ApiTokens.Revoke' })
    );

    await waitFor(() => expect(revoked).toEqual({ id: 'token-active' }));
  });

  it('should create a token and show its secret once', async () => {
    serveTokens([]);
    let created: ApiTokenCreateMutationVariables | undefined;
    mswServer.use(
      graphql.mutation('ApiTokenCreate', ({ variables }) => {
        created = variables as ApiTokenCreateMutationVariables;
        return HttpResponse.json({
          data: {
            createApiToken: {
              token: 'xhp_abcdef_secret',
              api_token: activeToken,
            },
          },
        });
      })
    );

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(
      screen.getByLabelText(/ApiTokens.Field.Name/),
      '  Filigran Copilot '
    );
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );

    expect(
      await screen.findByDisplayValue('xhp_abcdef_secret')
    ).toBeInTheDocument();
    expect(created?.input).toMatchObject({
      name: 'Filigran Copilot',
      scope: ApiTokenScope.Read,
      organization_id: 'org-test-456',
    });
    const lifetime =
      new Date(created!.input.expires_at as string).getTime() - Date.now();
    expect(Math.round(lifetime / DAY_MS)).toBe(90);
  });

  it('should not create a token whose name is only spaces', async () => {
    serveTokens([]);
    let called = false;
    mswServer.use(
      graphql.mutation('ApiTokenCreate', () => {
        called = true;
        return HttpResponse.json({ errors: [{ message: 'UNKNOWN_ERROR' }] });
      })
    );

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), '   ');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );

    expect(
      await screen.findByText('ApiTokens.Field.NameError')
    ).toBeInTheDocument();
    expect(called).toBe(false);
  });
});
