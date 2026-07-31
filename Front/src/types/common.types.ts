/** Primitives shared across every domain module. */

export type IdType = string;
export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

/** Finite lifecycle of any async read. Drives skeleton / empty / error UI. */
export type RequestStatusType = 'idle' | 'loading' | 'success' | 'error';

export interface IAsyncState<T> {
  data: Nullable<T>;
  status: RequestStatusType;
  error: Nullable<string>;
}

export interface IPaginationParams {
  page: number;
  pageSize: number;
}

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Discriminated result so services never throw across the UI boundary. */
export type ResultType<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type ToneType = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

export type SizeType = 'sm' | 'md' | 'lg';

export type TrendDirectionType = 'up' | 'down' | 'flat';

export interface ISelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
}
