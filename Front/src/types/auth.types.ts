import type { IUser } from './user.types';

export interface ISession {
  token: string;
  issuedAt: string;
  /** Absolute expiry; the guard treats a past date as "no session". */
  expiresAt: string;
  user: IUser;
}

export type AuthErrorType = 'invalid-credentials' | 'locked' | 'network';
