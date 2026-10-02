import { PlatformIdentifier } from '@graphql/generated';
import { NextRequest } from 'next/server';
import { redirectToFreeTrial } from './free-trial';
import { redirectToHandlePendingUser } from './handle-pending-user';
import { redirectToRegistration } from './registration';
import { redirectToResource } from './resource';
import { redirectToTransferPersoSpace } from './transfer-perso-space';

interface RedirectIdentifierGetRouteProps {
  params: Promise<{
    identifier: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RedirectIdentifierGetRouteProps
) {
  const awaitedParams = await params;
  switch (awaitedParams.identifier) {
    case 'register-opencti':
      return redirectToRegistration(
        request,
        'register',
        PlatformIdentifier.Opencti
      );
    case 'unregister-opencti':
      return redirectToRegistration(
        request,
        'unregister',
        PlatformIdentifier.Opencti
      );
    case 'register-openaev':
      return redirectToRegistration(
        request,
        'register',
        PlatformIdentifier.Openaev
      );
    case 'unregister-openaev':
      return redirectToRegistration(
        request,
        'unregister',
        PlatformIdentifier.Openaev
      );
    case 'transfer-personal-space':
      return redirectToTransferPersoSpace(request);
    case 'handle-pending-user':
      return redirectToHandlePendingUser(request);
    case 'free-trial':
    case 'create-free-trial':
    case 'create-openaev-free-trial':
      return redirectToFreeTrial(request);
  }
  return redirectToResource(awaitedParams, request);
}
