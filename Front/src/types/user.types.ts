import type { IdType } from './common.types';

export type UserRoleType = 'owner' | 'admin' | 'agent' | 'viewer';

export interface IUser {
  id: IdType;
  name: string;
  email: string;
  role: UserRoleType;
  avatarUrl?: string;
  /** Two-letter fallback rendered when no avatar is available. */
  initials: string;
  organization: string;
}

export type NotificationKindType = 'system' | 'conversation' | 'billing' | 'sync';

export interface INotification {
  id: IdType;
  kind: NotificationKindType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  href?: string;
}
