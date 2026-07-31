import {
  MOCK_ASSISTANT_SETTINGS,
  MOCK_NOTIFICATION_SETTINGS,
  MOCK_WORKSPACE_SETTINGS,
} from '@/mocks/settings.mock';
import type {
  AssistantSettingsFormType,
  NotificationSettingsFormType,
  WorkspaceSettingsFormType,
} from '@/schemas/settings.schema';
import type { ResultType } from '@/types';
import { STORAGE_KEYS } from '@/constants/app';
import { randomDelay } from '@/utils/async';
import { storage } from '@/utils/storage';

const SETTINGS_STORAGE_KEY = 'heliteb:settings';

export interface IWorkspaceSettingsBundle {
  workspace: WorkspaceSettingsFormType;
  assistant: AssistantSettingsFormType;
  notifications: NotificationSettingsFormType;
}

const DEFAULTS: IWorkspaceSettingsBundle = {
  workspace: MOCK_WORKSPACE_SETTINGS,
  assistant: MOCK_ASSISTANT_SETTINGS,
  notifications: MOCK_NOTIFICATION_SETTINGS,
};

/**
 * Stored client-side on purpose.
 *
 * The API has no workspace-settings endpoint: `app_config` only holds the SMTP
 * block (`GET/POST /api/smtp-config`), and the assistant's real behaviour lives in
 * the agent's system prompt plus `/api/agente-notas`. Pointing this screen at a
 * route that does not exist is what produced the 404, so preferences persist in
 * the browser until the backend exposes them.
 */
export async function fetchSettings(): Promise<ResultType<IWorkspaceSettingsBundle>> {
  await randomDelay(200, 420);
  return { ok: true, value: storage.get<IWorkspaceSettingsBundle>(SETTINGS_STORAGE_KEY, DEFAULTS) };
}

export async function saveSettingsSection<T>(
  section: keyof IWorkspaceSettingsBundle,
  values: T,
): Promise<ResultType<T>> {
  await randomDelay(280, 520);

  const current = storage.get<IWorkspaceSettingsBundle>(SETTINGS_STORAGE_KEY, DEFAULTS);
  storage.set(SETTINGS_STORAGE_KEY, { ...current, [section]: values });

  return { ok: true, value: values };
}

/** Exported so a future migration can clear stale preferences in one place. */
export const SETTINGS_KEYS = { storage: SETTINGS_STORAGE_KEY, session: STORAGE_KEYS.SESSION } as const;
