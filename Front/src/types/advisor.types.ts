import type { IdType } from './common.types';

export type AdvisorStatusType = 'online' | 'busy' | 'away' | 'offline';

export interface IAdvisor {
  id: IdType;
  name: string;
  email: string;
  initials: string;
  role: string;
  status: AdvisorStatusType;
  activeConversations: number;
  resolvedToday: number;
  /** Average first-response time in seconds. */
  avgResponseTime: number;
  satisfaction: number;
  specialties: string[];
}
