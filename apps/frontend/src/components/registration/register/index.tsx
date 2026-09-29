import Loader from '@/components/Loader';
import { RegistrationContext } from '@/components/registration/Context';
import { RegisterStateFailed } from '@/components/registration/register/Failed';
import { RegisterStateMissingCapability } from '@/components/registration/register/MissingCapability';
import { RegisterOrganizationForm } from '@/components/registration/register/OrganizationForm';
import { RegisterPlatform } from '@/components/registration/register/register.graphql';
import { RegisterStateSucceeded } from '@/components/registration/register/Succeeded';
import { RegisterStateTooManyOrganizations } from '@/components/registration/register/TooManyOrganizations';
import { useTranslate } from '@/hooks/use-translate';
import { toast } from '@filigran/ui/clients';
import OrganizationListUserOrganizationsQueryGraphql, {
  organizationListUserOrganizationsQuery,
} from '@generated/organizationListUserOrganizationsQuery.graphql';
import registerFragmentGraphql, {
  registerFragment$key,
} from '@generated/registerFragment.graphql';
import registerIsPlatformRegisteredFragmentGraphql, {
  registerIsPlatformRegisteredFragment$key,
} from '@generated/registerIsPlatformRegisteredFragment.graphql';
import RegisterIsPlatformRegisteredQueryGraphql, {
  registerIsPlatformRegisteredQuery,
} from '@generated/registerIsPlatformRegisteredQuery.graphql';
import {
  PlatformInput,
  registerPlatformMutation,
} from '@generated/registerPlatformMutation.graphql';
import { PlatformRegistrationStatus } from '@graphql/generated';
import {
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  PreloadedQuery,
  useFragment,
  useLazyLoadQuery,
  useMutation,
  usePreloadedQuery,
} from 'react-relay';

interface RegisterProps {
  platform: PlatformInput;
  queryRef: PreloadedQuery<registerIsPlatformRegisteredQuery>;
}

export type RegistrationRequestStatus =
  'idle' | 'succeeded' | 'failed' | 'missed-capability';

interface State {
  registrationRequestStatus: RegistrationRequestStatus;
  chosenOrganizationId?: string;
  registerFragmentRef: registerFragment$key | null;
}

type Action =
  | { type: 'SET_ORGANIZATION_ID'; payload: string }
  | { type: 'SET_FRAGMENT_REF'; payload: registerFragment$key }
  | { type: 'SET_STATUS'; payload: RegistrationRequestStatus }
  | { type: 'SET_SUCCEEDED' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_ORGANIZATION_ID':
      return { ...state, chosenOrganizationId: action.payload };
    case 'SET_FRAGMENT_REF':
      return { ...state, registerFragmentRef: action.payload };
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
  registerFragmentRef: null,
};

export const Register = ({ queryRef, platform }: RegisterProps) => {
  const t = useTranslate();
  const { displayedIdentifier, identifier } = useContext(RegistrationContext);
  const [state, dispatch] = useReducer(reducer, initialState);

  const isPlatformRegisteredPreloadedQuery =
    usePreloadedQuery<registerIsPlatformRegisteredQuery>(
      RegisterIsPlatformRegisteredQueryGraphql,
      queryRef
    );

  const userOrganizationsQueryData =
    useLazyLoadQuery<organizationListUserOrganizationsQuery>(
      OrganizationListUserOrganizationsQueryGraphql,
      {}
    );

  const isPlatformRegistered =
    useFragment<registerIsPlatformRegisteredFragment$key>(
      registerIsPlatformRegisteredFragmentGraphql,
      isPlatformRegisteredPreloadedQuery.isPlatformRegistered
    );

  const [registerPlatform] =
    useMutation<registerPlatformMutation>(RegisterPlatform);

  const registerDataResponse = useFragment<registerFragment$key>(
    registerFragmentGraphql,
    state.registerFragmentRef
  );

  const hasPostedMessageRef = useRef(false);
  const hasAutoRegisteredRef = useRef(false);

  const cancel = useCallback(() => {
    window.opener?.postMessage({ action: 'cancel' }, '*');
  }, []);

  const register = useCallback(
    (organizationId: string, platformName: string = platform.title) => {
      if (!identifier) {
        return;
      }
      dispatch({ type: 'SET_ORGANIZATION_ID', payload: organizationId });
      registerPlatform({
        variables: {
          input: {
            organizationId,
            platform: { ...platform, title: platformName },
            identifier,
          },
        },
        onCompleted: (response) => {
          dispatch({
            type: 'SET_FRAGMENT_REF',
            payload: response.registerPlatform,
          });
        },
        onError: (error) => {
          if (error.message === 'MISSING_CAPABILITY_ON_ORGANIZATION') {
            dispatch({ type: 'SET_STATUS', payload: 'missed-capability' });
          } else {
            dispatch({ type: 'SET_STATUS', payload: 'failed' });
            toast({
              variant: 'destructive',
              title: t('Utils.Error'),
              description: t(`Error.Server.${error.message}`),
            });
          }
        },
      });
    },
    [identifier, platform, registerPlatform, t]
  );

  useLayoutEffect(() => {
    if (registerDataResponse?.token && !hasPostedMessageRef.current) {
      hasPostedMessageRef.current = true;
      window.opener?.postMessage(
        {
          action: 'register',
          token: registerDataResponse.token,
        },
        '*'
      );
      dispatch({ type: 'SET_SUCCEEDED' });
    }
  }, [registerDataResponse?.token]);

  useLayoutEffect(() => {
    const shouldAutoRegister =
      isPlatformRegistered.status === PlatformRegistrationStatus.Registered &&
      isPlatformRegistered.organization &&
      !hasAutoRegisteredRef.current;

    if (shouldAutoRegister) {
      hasAutoRegisteredRef.current = true;
      register(isPlatformRegistered.organization.id);
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

    const shouldRegisterOnSameOrganization =
      isPlatformRegistered.status === PlatformRegistrationStatus.Unregistered &&
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

    if (
      isPlatformRegistered.status ===
        PlatformRegistrationStatus.NeverRegistered ||
      isPlatformRegistered.status === PlatformRegistrationStatus.Unregistered
    ) {
      return (
        <RegisterOrganizationForm
          userOrganizationsQueryData={userOrganizationsQueryData}
          defaultPlatformName={platform.title}
          cancel={cancel}
          confirm={register}
        />
      );
    }

    return <Loader />;
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
