import type { IdType } from './common.types';

export type AdvisorStatusType = 'online' | 'busy' | 'away' | 'offline';

export interface IAdvisor {
  id: IdType;
  name: string;
  email: string;
  phone: string;
  initials: string;
  role: 'admin' | 'asesor';
  status: AdvisorStatusType;
  active: boolean;
}
