import type { ServiceInstanceId } from '../../model/kanel/public/ServiceInstance';

export const REGISTRATION_QUEUES = {
  COMMERCIAL_MODEL: 'registration.commercial-model',
  DEAD_LETTER: 'registration.deadletter',
} as const;

export interface CommercialModelJobData {
  serviceInstanceId: ServiceInstanceId;
  platformId: string;
}
