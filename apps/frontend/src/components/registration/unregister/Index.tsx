import Loader from '@/components/Loader';
import { RegistrationContext } from '@/components/registration/Context';
import { RegistrationLayout } from '@/components/registration/Layout';
import { UnregisterConfirm } from '@/components/registration/unregister/Confirm';
import { UnregisterMissingCapability } from '@/components/registration/unregister/MissingCapability';
import { UnregisterPlatformNotRegistered } from '@/components/registration/unregister/PlatformNotRegistered';
import { showSnackbar } from '@/components/ui/snackbar/snackbar-store';
import { useTranslate } from '@/hooks/use-translate';
import { portalGraphqlClient } from '@/lib/graphql-client';
import {
  CanUnregisterPlatformQuery,
  PlatformIdentifier,
  useUnregisterPlatformMutation,
} from '@graphql/generated';
import { useContext, useRef, useState } from 'react';

interface UnregisterProps {
  platformId: string;
  tenantId?: string | null;
  canUnregisterPlatform: CanUnregisterPlatformQuery['canUnregisterPlatform'];
  /** The nonce XTM One opened the page with, echoed back in its messages. */
  state?: string;
}

type UnregistrationStatus = 'idle' | 'succeeded' | 'failed';

export const Unregister = ({
  canUnregisterPlatform,
  platformId,
  tenantId,
  state,
}: UnregisterProps) => {
  const { displayedIdentifier, identifier } = useContext(RegistrationContext);
  const t = useTranslate();
  const {
    isAllowed,
    isPlatformRegistered,
    isInOrganization,
    organizationId,
    organizationName,
  } = canUnregisterPlatform;

  const { mutate: unregisterPlatform } =
    useUnregisterPlatformMutation(portalGraphqlClient);

  const [status, setStatus] = useState<UnregistrationStatus>('idle');
  // Set synchronously so that a confirm called again while the request is pending (the not-registered page calls it
  // from an effect that each render reruns) cannot start another one: only the latest call runs its callbacks, so a
  // second call would loop and hide the success the opener waits for. It stays set once the unregistration succeeds.
  const isUnregisteringRef = useRef(false);
  // OpenCTI and OpenAEV never receive the state: their messages are unchanged.
  const echoedState =
    identifier === PlatformIdentifier.Xtmone ? state : undefined;
  const postToOpener = (action: 'cancel' | 'unregister') => {
    window.opener?.postMessage(
      { action, ...(echoedState && { state: echoedState }) },
      '*'
    );
  };
  const cancel = () => postToOpener('cancel');

  const confirm = () => {
    if (!identifier || isUnregisteringRef.current) {
      return;
    }
    isUnregisteringRef.current = true;

    unregisterPlatform(
      {
        input: {
          platformId,
          identifier,
          tenantId: tenantId ?? null,
        },
      },
      {
        onSuccess: () => {
          postToOpener('unregister');
          setStatus('succeeded');
        },
        onError: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : 'UNKNOWN_ERROR';
          isUnregisteringRef.current = false;
          setStatus('failed');
          showSnackbar({
            severity: 'error',
            title: t('Utils.Error'),
            description: t(`Error.Server.${errorMessage}`),
          });
        },
      }
    );
  };

  if (status === 'succeeded') {
    return (
      <RegistrationLayout>
        <h1 className="title-sm">
          {t(`Unregister.Succeeded.Title`, {
            platformIdentifier: displayedIdentifier,
          })}
        </h1>
        <p>{t(`Unregister.Succeeded.Description`)}</p>
      </RegistrationLayout>
    );
  }

  if (status === 'failed') {
    return (
      <RegistrationLayout>
        <h1 className="title-sm">{t(`Unregister.Failed.Title`)}</h1>
        <p>{t(`Unregister.Failed.Description`)}</p>
      </RegistrationLayout>
    );
  }

  if (!isPlatformRegistered) {
    return <UnregisterPlatformNotRegistered confirm={confirm} />;
  }

  if (!isAllowed) {
    if (!isInOrganization) {
      return (
        <RegistrationLayout
          cancel={cancel}
          cancelAnalyticsId="platform_disconnection_cancel">
          <h1 className="title-sm">
            {t(`Unregister.Error.NotInOrganization.Title`)}
          </h1>
        </RegistrationLayout>
      );
    }

    return organizationId ? (
      <UnregisterMissingCapability
        organizationId={organizationId}
        cancel={cancel}
      />
    ) : (
      <Loader />
    );
  }

  return organizationName ? (
    <UnregisterConfirm
      cancel={cancel}
      confirm={confirm}
      organizationName={organizationName}
    />
  ) : (
    <Loader />
  );
};
