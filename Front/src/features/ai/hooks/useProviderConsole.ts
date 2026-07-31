import { useCallback, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '@/constants/app';
import { useAsyncResource, type IAsyncResource } from '@/hooks/useAsyncResource';
import { fetchConnections, fetchProviderUsage } from '@/services/ai-provider.service';
import type { IProviderConnection, IProviderUsage, ProviderIdType } from '@/types';
import { normalizeText } from '@/utils/collection';
import { storage } from '@/utils/storage';
import { PROVIDER_DEFINITIONS } from '../config';

export interface IProviderConsoleState {
  connections: IAsyncResource<IProviderConnection[]>;
  usage: IAsyncResource<IProviderUsage[]>;
  connectionsById: Map<ProviderIdType, IProviderConnection>;
  query: string;
  setQuery: (query: string) => void;
  visibleProviderIds: ProviderIdType[];
  autosave: boolean;
  setAutosave: (enabled: boolean) => void;
  updateConnection: (connection: IProviderConnection) => void;
  connectedCount: number;
  attentionCount: number;
}

/** Screen-level state for the AI console: data, filtering and autosave policy. */
export function useProviderConsole(): IProviderConsoleState {
  const connections = useAsyncResource(fetchConnections);
  const usage = useAsyncResource(fetchProviderUsage);
  const [query, setQuery] = useState('');
  const [autosave, setAutosaveState] = useState(() =>
    storage.get<boolean>(STORAGE_KEYS.AI_AUTOSAVE, false),
  );

  const setAutosave = useCallback((enabled: boolean) => {
    storage.set(STORAGE_KEYS.AI_AUTOSAVE, enabled);
    setAutosaveState(enabled);
  }, []);

  const connectionsById = useMemo(
    () => new Map((connections.data ?? []).map((item) => [item.providerId, item])),
    [connections.data],
  );

  const visibleProviderIds = useMemo(() => {
    const needle = normalizeText(query);

    return PROVIDER_DEFINITIONS.filter(
      (definition) =>
        !needle ||
        normalizeText(definition.name).includes(needle) ||
        normalizeText(definition.vendor).includes(needle) ||
        normalizeText(definition.description).includes(needle),
    ).map((definition) => definition.id);
  }, [query]);

  const updateConnection = useCallback(
    (connection: IProviderConnection) => {
      connections.setData((current) =>
        current.map((item) => (item.providerId === connection.providerId ? connection : item)),
      );
    },
    [connections],
  );

  const connectedCount = useMemo(
    () => (connections.data ?? []).filter((item) => item.status === 'connected').length,
    [connections.data],
  );

  const attentionCount = useMemo(
    () =>
      (connections.data ?? []).filter(
        (item) => item.status === 'invalid' || item.status === 'incomplete',
      ).length,
    [connections.data],
  );

  return {
    connections,
    usage,
    connectionsById,
    query,
    setQuery,
    visibleProviderIds,
    autosave,
    setAutosave,
    updateConnection,
    connectedCount,
    attentionCount,
  };
}
