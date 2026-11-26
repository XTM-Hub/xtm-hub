import Loader from '@/components/Loader';
import { RegistrationContext } from '@/components/registration/Context';
import { RegisterStateFailed } from '@/components/registration/register/Failed';
import { RegisterStateMissingCapability } from '@/components/registration/register/MissingCapability';
import { RegisterOrganizationForm } from '@/components/registration/register/OrganizationForm';
import { RegisterStateSucceeded } from '@/components/registration/register/Succeeded';
import { RegisterStateTooManyOrganizations } from '@/components/registration/register/TooManyOrganizations';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  IsPlatformRegisteredQuery,
  PlatformIdentifier,
  PlatformInput,
  PlatformRegistrationStatus,
  RegisterPlatformMutation,
  useRegisterPlatformMutation,
  useUserOrganizationsQuery,
} from '@graphql/generated';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

interface RegisterProps {
  platform: PlatformInput;
  platformOrigin: string;
  isPlatformRegistered: IsPlatformRegisteredQuery['isPlatformRegistered'];
  /** The nonce XTM One opened the page with, echoed back in its messages. */
  state?: string;
}

export type RegistrationRequestStatus =
  'idle' | 'succeeded' | 'failed' | 'missed-capability';

interface State {
  registrationRequestStatus: RegistrationRequestStatus;
  chosenOrganizationId?: string;
  /** What the platform gets back once registered. */
  registration: RegisterPlatformMutation['registerPlatform'] | null;
}

type Action =
  | { type: 'SET_ORGANIZATION_ID'; payload: string }
  | {
      type: 'SET_REGISTRATION';
      payload: RegisterPlatformMutation['registerPlatform'];
    }
  | { type: 'SET_STATUS'; payload: RegistrationRequestStatus }
  | { type: 'SET_SUCCEEDED' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_ORGANIZATION_ID':
      return { ...state, chosenOrganizationId: action.payload };
    case 'SET_REGISTRATION':
      return { ...state, registration: action.payload };
    case 'SET_STATUS':
      return { ...state, registrationRequestStatus: action.payload };
    case 'SET_SUCCEEDED':
      return { ...state, registrationRequestStatus: 'succeeded' };
    default:
      return state;
  }
};

const initialState: State = {
  registrationRequestStatus: 'idle',
  chosenOrganizationId: undefined,
  registration: null,
};

export const Register = ({
  isPlatformRegistered,
  platform,
  platformOrigin,
  state: openerState,
}: RegisterProps) => {
  const t = useTranslate();
  const { displayedIdentifier, identifier } = useContext(RegistrationContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  // Suspends like the rest of the page until the organizations are loaded.
  const { data: userOrganizationsQueryData } = useSuspenseQuery({
    queryKey: useUserOrganizationsQuery.getKey(),
    queryFn: useUserOrganizationsQuery.fetcher(portalGraphqlClient),
  });

  const { mutate: registerPlatform } =
    useRegisterPlatformMutation(portalGraphqlClient);

  const hasPostedMessageRef = useRef(false);
  const hasAutoRegisteredRef = useRef(false);
  // Set synchronously so that a second click on a still-enabled confirm button cannot start another registration:
  // only the latest call runs its callbacks, so a failing second call would hide the token the first one got.
  // It stays set once a registration succeeds.
  const isRegisteringRef = useRef(false);

  // OpenCTI and OpenAEV never receive the state: their messages are unchanged.
  const echoedState =
    identifier === PlatformIdentifier.Xtmone ? openerState : undefined;

  const postMessageToPlatform = useCallback(
    (message: Record<string, unknown>) => {
      window.opener?.postMessage(
        { ...message, ...(echoedState && { state: echoedState }) },
        platformOrigin
      );
    },
    [platformOrigin, echoedState]
  );

  const cancel = useCallback(() => {
    postMessageToPlatform({ action: 'cancel' });
  }, [postMessageToPlatform]);

  const register = useCallback(
    (organizationId: string, platformName: string = platform.title) => {
      if (!identifier || isRegisteringRef.current) {
        return;
      }
      isRegisteringRef.current = true;
      dispatch({ type: 'SET_ORGANIZATION_ID', payload: organizationId });
      registerPlatform(
        {
          input: {
            organizationId,
            platform: { ...platform, title: platformName },
            identifier,
          },
        },
        {
          onSuccess: (response) => {
            dispatch({
              type: 'SET_REGISTRATION',
              payload: response.registerPlatform,
            });
          },
          onError: (error) => {
            isRegisteringRef.current = false;
            const errorMessage =
              error instanceof Error ? error.message : 'UNKNOWN_ERROR';
            if (errorMessage === 'MISSING_CAPABILITY_ON_ORGANIZATION') {
              dispatch({ type: 'SET_STATUS', payload: 'missed-capability' });
            } else {
              dispatch({ type: 'SET_STATUS', payload: 'failed' });
              showSnackbar({
                severity: 'error',
                title: t('Utils.Error'),
                description: t(`Error.Server.${errorMessage}`),
              });
            }
          },
        }
      );
    },
    [identifier, platform, registerPlatform, t]
  );

  useLayoutEffect(() => {
    if (state.registration && !hasPostedMessageRef.current) {
      hasPostedMessageRef.current = true;
      postMessageToPlatform({
        action: 'register',
        token: state.registration.token,
        organizationName: state.registration.organizationName,
      });
      dispatch({ type: 'SET_SUCCEEDED' });
    }
  }, [state.registration, postMessageToPlatform]);

  useLayoutEffect(() => {
    const { status, organization } = isPlatformRegistered;
    const shouldAutoRegister =
      status === PlatformRegistrationStatus.Registered &&
      organization &&
      !hasAutoRegisteredRef.current;

    if (shouldAutoRegister) {
      hasAutoRegisteredRef.current = true;
      register(organization.id);
    }
  }, [isPlatformRegistered, register]);

  return useMemo(() => {
    const renderers = new Map<RegistrationRequestStatus, () => ReactNode>([
      [
        'missed-capability',
        () =>
          state.chosenOrganizationId ? (
            <RegisterStateMissingCapability
              organizationId={state.chosenOrganizationId}
              cancel={cancel}
            />
          ) : (
            <Loader />
          ),
      ],
      [
        'succeeded',
        () => (
          <RegisterStateSucceeded displayedIdentifier={displayedIdentifier} />
        ),
      ],
      ['failed', () => <RegisterStateFailed cancel={cancel} />],
    ]);

    const renderer = renderers.get(state.registrationRequestStatus);
    if (renderer) {
      return renderer();
    }

    // The owner organization is only known to its members: anyone else picks one of their own organizations.
    const isOwnedByUserOrganization = !!isPlatformRegistered.organization;
    const shouldRegisterOnSameOrganization =
      isPlatformRegistered.status === PlatformRegistrationStatus.Unregistered &&
      isOwnedByUserOrganization &&
      userOrganizationsQueryData.userOrganizations.length > 2;
    if (shouldRegisterOnSameOrganization) {
      return (
        <RegisterStateTooManyOrganizations
          cancel={cancel}
          confirm={() => register(isPlatformRegistered.organization?.id ?? '')}
          displayedIdentifier={displayedIdentifier}
          platformTitle={isPlatformRegistered.platformTitle ?? ''}
        />
      );
    }

    // Registered on a known organization: the effect above registers it again there.
    const isAutoRegistering =
      isPlatformRegistered.status === PlatformRegistrationStatus.Registered &&
      isOwnedByUserOrganization;
    if (isAutoRegistering) {
      return <Loader />;
    }

    return (
      <RegisterOrganizationForm
        userOrganizationsQueryData={userOrganizationsQueryData}
        defaultPlatformName={platform.title}
        cancel={cancel}
        confirm={register}
      />
    );
  }, [
    cancel,
    state.chosenOrganizationId,
    state.registrationRequestStatus,
    platform.title,
    displayedIdentifier,
    isPlatformRegistered,
    register,
    userOrganizationsQueryData,
  ]);
};
