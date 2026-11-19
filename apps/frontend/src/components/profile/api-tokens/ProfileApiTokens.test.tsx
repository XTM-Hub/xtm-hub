import { ProfileApiTokens } from '@/components/profile/api-tokens/ProfileApiTokens';
import { mswServer } from '@/utils/test/msw/server';
import testRender from '@/utils/test/test-render';
import {
  ApiTokenCreateMutation,
  ApiTokenCreateMutationVariables,
  ApiTokenRevokeMutationVariables,
  ApiTokenRowFragment,
  ApiTokenScope,
} from '@graphql/generated';
import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import { graphql, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
}));

vi.mock('@/components/ui/snackbar/snackbar-store', () => ({
  showSnackbar: mocks.showSnackbar,
}));

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

const serveCreated = () =>
  mswServer.use(
    graphql.mutation('ApiTokenCreate', () =>
      HttpResponse.json({
        data: {
          createApiToken: {
            token: 'xhp_abcdef_secret',
            api_token: activeToken,
          },
        },
      })
    )
  );

// Holds the creation response until `respond` is called, and counts the list requests
// so a test can wait for the refresh that follows a completed creation.
const serveDelayedCreation = () => {
  let listRequestCount = 0;
  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  mswServer.use(
    graphql.query('ApiTokens', () => {
      listRequestCount += 1;
      return HttpResponse.json({ data: { apiTokens: [] } });
    }),
    graphql.mutation('ApiTokenCreate', async () => {
      await released;
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
  return { listRequests: () => listRequestCount, respond: release };
};

const openAndSubmitCreation = async (
  user: ReturnType<typeof testRender>['user']
) => {
  await user.click(
    await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
  );
  await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
  await user.click(
    screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
  );
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    ).toBeDisabled()
  );
};

describe('ProfileApiTokens', () => {
  beforeEach(() => {
    mocks.showSnackbar.mockReset();
  });

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

  it('should narrow the list with the search and say when nothing matches', async () => {
    serveTokens([revokedToken, activeToken]);

    const { user } = testRender(<ProfileApiTokens />);

    await screen.findByText('Filigran Copilot');
    await user.type(
      screen.getByRole('searchbox', { name: 'ApiTokens.Toolbar.Search' }),
      'old'
    );

    expect(screen.getByText('Old script')).toBeInTheDocument();
    expect(screen.queryByText('Filigran Copilot')).toBeNull();

    await user.type(
      screen.getByRole('searchbox', { name: 'ApiTokens.Toolbar.Search' }),
      'zzz'
    );

    expect(screen.getByText('ApiTokens.Toolbar.NoMatch')).toBeInTheDocument();
  });

  it('should filter the list by status', async () => {
    serveTokens([revokedToken, activeToken]);

    const { user } = testRender(<ProfileApiTokens />);

    await screen.findByText('Filigran Copilot');
    await user.click(
      screen.getByRole('combobox', { name: 'ApiTokens.Column.Status' })
    );
    await user.click(
      screen.getByRole('option', { name: 'ApiTokens.Status.revoked' })
    );

    expect(screen.getByText('Old script')).toBeInTheDocument();
    expect(screen.queryByText('Filigran Copilot')).toBeNull();
  });

  it('should give every field of the create dialog an info bubble', async () => {
    serveTokens([]);

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    const dialog = await screen.findByRole('dialog');

    expect(
      within(dialog).getAllByRole('button', {
        name: 'ApiTokens.Field.InfoLabel',
      })
    ).toHaveLength(4);
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

  it('should show the server error when the creation is rejected', async () => {
    serveTokens([]);
    mswServer.use(
      graphql.mutation('ApiTokenCreate', () =>
        HttpResponse.json({ errors: [{ message: 'FORBIDDEN_ACCESS' }] })
      )
    );

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );

    await waitFor(() =>
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', title: 'Utils.Error' })
      )
    );
    expect(screen.queryByDisplayValue('xhp_abcdef_secret')).toBeNull();
  });

  it('should copy the secret and forget it once the dialog is closed', async () => {
    serveTokens([]);
    serveCreated();

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );
    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Created.Copy' })
    );

    expect(await navigator.clipboard.readText()).toBe('xhp_abcdef_secret');
    expect(mocks.showSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );

    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Created.Done' })
    );

    await waitFor(() =>
      expect(screen.queryByDisplayValue('xhp_abcdef_secret')).toBeNull()
    );
  });

  it('should keep the secret dialog open on Escape and offer no corner close icon', async () => {
    serveTokens([]);
    serveCreated();

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );
    await screen.findByDisplayValue('xhp_abcdef_secret');

    await user.keyboard('{Escape}');

    expect(screen.getByDisplayValue('xhp_abcdef_secret')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).queryByRole('button', {
        name: 'Close',
      })
    ).toBeNull();
  });

  it('should remove the secret from the mutation cache once the dialog is closed', async () => {
    serveTokens([]);
    serveCreated();
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const cachedSecrets = () =>
      queryClient
        .getMutationCache()
        .getAll()
        .map(
          (mutation) =>
            (mutation.state.data as ApiTokenCreateMutation | undefined)
              ?.createApiToken?.token
        )
        .filter(Boolean);

    const { user } = testRender(<ProfileApiTokens />, { queryClient });

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );
    await screen.findByDisplayValue('xhp_abcdef_secret');
    expect(cachedSecrets()).toEqual(['xhp_abcdef_secret']);

    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Created.Done' })
    );

    await waitFor(() => expect(cachedSecrets()).toEqual([]));
  });

  it('should not show the secret of a creation cancelled before it completed', async () => {
    const { listRequests, respond } = serveDelayedCreation();

    const { user } = testRender(<ProfileApiTokens />);

    await openAndSubmitCreation(user);
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));
    respond();
    await waitFor(() => expect(listRequests()).toBe(2));
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Open' })
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('xhp_abcdef_secret')).toBeNull();
  });

  it('should not submit a new creation until the cancelled one has completed', async () => {
    const { listRequests, respond } = serveDelayedCreation();

    const { user } = testRender(<ProfileApiTokens />);

    await openAndSubmitCreation(user);
    await user.click(screen.getByRole('button', { name: 'Utils.Cancel' }));
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Open' })
    );

    expect(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    ).toBeDisabled();

    respond();
    await waitFor(() => expect(listRequests()).toBe(2));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
      ).toBeEnabled()
    );
  });

  it('should say so when the secret cannot be copied', async () => {
    serveTokens([]);
    serveCreated();

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.Create.Open' })
    );
    await user.type(screen.getByLabelText(/ApiTokens.Field.Name/), 'Script');
    await user.click(
      screen.getByRole('button', { name: 'ApiTokens.Create.Submit' })
    );
    const copy = await screen.findByRole('button', {
      name: 'ApiTokens.Created.Copy',
    });
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(
      new Error('denied')
    );
    await user.click(copy);

    await waitFor(() =>
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          description: 'ApiTokens.Created.CopyFailed',
        })
      )
    );
  });

  it('should show the server error when the revocation is rejected', async () => {
    serveTokens([activeToken]);
    mswServer.use(
      graphql.mutation('ApiTokenRevoke', () =>
        HttpResponse.json({ errors: [{ message: 'FORBIDDEN_ACCESS' }] })
      )
    );

    const { user } = testRender(<ProfileApiTokens />);

    await user.click(
      await screen.findByRole('button', { name: 'ApiTokens.RevokeNamed' })
    );
    const dialog = await screen.findByRole('alertdialog');
    await user.click(
      within(dialog).getByRole('button', { name: 'ApiTokens.Revoke' })
    );

    await waitFor(() =>
      expect(mocks.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', title: 'Utils.Error' })
      )
    );
  });
});
