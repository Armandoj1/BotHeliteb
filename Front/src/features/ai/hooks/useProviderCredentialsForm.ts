import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { useAutosave } from '@/hooks/useAutosave';
import { useToast } from '@/hooks/useToast';
import {
  buildCredentialsSchema,
  buildEmptyCredentials,
} from '@/schemas/provider-credentials.schema';
import {
  restoreConnection,
  saveConnection,
  testConnection,
} from '@/services/ai-provider.service';
import type {
  ConnectionStatusType,
  IProviderConnection,
  IProviderDefinition,
  ProviderCredentialsType,
} from '@/types';

export interface IProviderFormState {
  form: UseFormReturn<ProviderCredentialsType>;
  status: ConnectionStatusType;
  isDirty: boolean;
  isSaving: boolean;
  isTesting: boolean;
  isRestoring: boolean;
  onSave: () => void;
  onTest: () => void;
  onRestore: () => void;
}

export interface IUseProviderFormOptions {
  definition: IProviderDefinition;
  connection: IProviderConnection;
  autosave: boolean;
  onConnectionChange: (connection: IProviderConnection) => void;
}

/** Owns every behaviour of a single provider card: validation, save, test, restore. */
export function useProviderCredentialsForm({
  definition,
  connection,
  autosave,
  onConnectionChange,
}: IUseProviderFormOptions): IProviderFormState {
  const toast = useToast();
  const [status, setStatus] = useState<ConnectionStatusType>(connection.status);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const form = useForm<ProviderCredentialsType>({
    resolver: zodResolver(buildCredentialsSchema(definition)),
    defaultValues: { ...buildEmptyCredentials(definition), ...connection.credentials },
    mode: 'onChange',
  });

  useEffect(() => setStatus(connection.status), [connection.status]);

  const persist = useCallback(
    async (values: ProviderCredentialsType, { silent }: { silent: boolean }) => {
      setIsSaving(true);
      const result = await saveConnection(definition.id, values);
      setIsSaving(false);

      if (!result.ok) {
        toast.error({ title: 'No se pudo guardar', description: result.error });
        return;
      }

      form.reset(values, { keepValues: true });
      setStatus(result.value.status);
      onConnectionChange(result.value);

      if (!silent) {
        toast.success({
          title: `${definition.name} actualizado`,
          description: 'Las credenciales se guardaron correctamente.',
        });
      }
    },
    [definition.id, definition.name, form, onConnectionChange, toast],
  );

  useAutosave(form.watch(), (values) => void persist(values, { silent: true }), {
    enabled: autosave,
    canSave: form.formState.isDirty && form.formState.isValid,
  });

  const onSave = form.handleSubmit((values) => void persist(values, { silent: false }));

  const onTest = useCallback(async () => {
    setIsTesting(true);
    setStatus('testing');

    const result = await testConnection(definition.id, form.getValues());
    setIsTesting(false);

    if (!result.ok) {
      setStatus('invalid');
      toast.error({ title: 'Prueba fallida', description: result.error });
      return;
    }

    const { status: nextStatus, message, latencyMs, testedAt } = result.value;
    setStatus(nextStatus);
    onConnectionChange({
      ...connection,
      credentials: form.getValues(),
      status: nextStatus,
      lastTestedAt: testedAt,
      latencyMs,
      message,
    });

    const notify = nextStatus === 'connected' ? toast.success : toast.error;
    notify({ title: `${definition.name}: ${message}`, description: `Latencia ${latencyMs} ms` });
  }, [connection, definition.id, definition.name, form, onConnectionChange, toast]);

  const onRestore = useCallback(async () => {
    setIsRestoring(true);
    const result = await restoreConnection(definition.id);
    setIsRestoring(false);

    if (!result.ok) {
      toast.error({ title: 'No se pudo restaurar', description: result.error });
      return;
    }

    form.reset({ ...buildEmptyCredentials(definition), ...result.value.credentials });
    setStatus(result.value.status);
    onConnectionChange(result.value);
    toast.info({
      title: `${definition.name} restaurado`,
      description: 'Se recuperaron los últimos valores confirmados.',
    });
  }, [definition, form, onConnectionChange, toast]);

  return {
    form,
    status,
    isDirty: form.formState.isDirty,
    isSaving,
    isTesting,
    isRestoring,
    onSave: () => void onSave(),
    onTest: () => void onTest(),
    onRestore: () => void onRestore(),
  };
}
