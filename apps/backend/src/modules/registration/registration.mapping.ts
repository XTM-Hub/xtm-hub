import {
  PlatformIdentifier,
  ServiceDefinitionIdentifier,
  ServiceInstanceTag,
} from '../../__generated__/resolvers-types';

export const serviceDefinitionIdentifierMappedByPlatformIdentifier: Record<
  PlatformIdentifier,
  ServiceDefinitionIdentifier
> = {
  [PlatformIdentifier.Opencti]: ServiceDefinitionIdentifier.OpenctiRegistration,
  [PlatformIdentifier.Openaev]: ServiceDefinitionIdentifier.OpenaevRegistration,
  [PlatformIdentifier.Xtmone]: ServiceDefinitionIdentifier.XtmoneRegistration,
};

export const platformIdentifierMappedByServiceDefinitionIdentifier: Partial<
  Record<ServiceDefinitionIdentifier, PlatformIdentifier>
> = {
  [ServiceDefinitionIdentifier.OpenctiRegistration]: PlatformIdentifier.Opencti,
  [ServiceDefinitionIdentifier.OpenaevRegistration]: PlatformIdentifier.Openaev,
  [ServiceDefinitionIdentifier.XtmoneRegistration]: PlatformIdentifier.Xtmone,
};

export const serviceInstanceNameMappedByPlatformIdentifier: Record<
  PlatformIdentifier,
  string
> = {
  [PlatformIdentifier.Opencti]: 'OpenCTI Platform',
  [PlatformIdentifier.Openaev]: 'OpenAEV Platform',
  [PlatformIdentifier.Xtmone]: 'XTM One Platform',
};

export const serviceInstanceTagMappedByPlatformIdentifier: Record<
  PlatformIdentifier,
  ServiceInstanceTag
> = {
  [PlatformIdentifier.Opencti]: ServiceInstanceTag.OpenCti,
  [PlatformIdentifier.Openaev]: ServiceInstanceTag.OpenAev,
  [PlatformIdentifier.Xtmone]: ServiceInstanceTag.XtmOne,
};
