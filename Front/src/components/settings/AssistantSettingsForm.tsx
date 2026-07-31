import { useMemo } from 'react';
import { Controller } from 'react-hook-form';

import { FormField, Input, Select, Textarea } from '@/components/ui';
import { PROVIDER_DEFINITIONS } from '@/features/ai/config';
import { useSettingsSection } from '@/features/settings/hooks/useSettingsSection';
import { TEMPERATURE_OPTIONS } from '@/mocks/settings.mock';
import {
  assistantSettingsSchema,
  type AssistantSettingsFormType,
} from '@/schemas/settings.schema';
import { SettingsSection } from './SettingsSection';
import { SettingsToggleRow } from './SettingsToggleRow';

export interface IAssistantSettingsFormProps {
  defaultValues: AssistantSettingsFormType;
}

export function AssistantSettingsForm({ defaultValues }: IAssistantSettingsFormProps) {
  const { form, isSaving, isDirty, onSubmit, onReset } = useSettingsSection({
    section: 'assistant',
    schema: assistantSettingsSchema,
    defaultValues,
    successTitle: 'Comportamiento del asistente actualizado',
  });

  const { register, control, formState } = form;

  // The fallback list is derived from the provider registry, never hardcoded.
  const providerOptions = useMemo(
    () =>
      PROVIDER_DEFINITIONS.map((definition) => ({
        value: definition.id,
        label: definition.name,
        description: definition.vendor,
      })),
    [],
  );

  return (
    <SettingsSection
      title="Comportamiento del asistente"
      description="Parámetros de generación y reglas de seguridad aplicadas a cada respuesta."
      isDirty={isDirty}
      isSaving={isSaving}
      onSubmit={onSubmit}
      onReset={onReset}
    >
      <FormField label="Nivel de creatividad" error={formState.errors.temperature?.message}>
        {({ id }) => (
          <Controller
            control={control}
            name="temperature"
            render={({ field }) => (
              <Select
                id={id}
                value={field.value}
                onValueChange={field.onChange}
                options={TEMPERATURE_OPTIONS}
                aria-label="Nivel de creatividad"
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label="Tokens máximos por respuesta"
        hint="Limita el costo y la extensión de cada mensaje."
        error={formState.errors.maxTokens?.message}
      >
        {({ id, describedBy }) => (
          <Input
            {...register('maxTokens')}
            id={id}
            type="number"
            min={256}
            max={32_000}
            step={256}
            aria-describedby={describedBy}
            tone={formState.errors.maxTokens ? 'invalid' : 'default'}
          />
        )}
      </FormField>

      <FormField
        label="Proveedor de respaldo"
        hint="Se usa automáticamente si el proveedor principal falla."
        error={formState.errors.fallbackProvider?.message}
        className="sm:col-span-2"
      >
        {({ id }) => (
          <Controller
            control={control}
            name="fallbackProvider"
            render={({ field }) => (
              <Select
                id={id}
                value={field.value}
                onValueChange={field.onChange}
                options={providerOptions}
                aria-label="Proveedor de respaldo"
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label="Prompt base"
        hint="Se antepone a las notas del agente en cada conversación."
        error={formState.errors.systemPrompt?.message}
        className="sm:col-span-2"
      >
        {({ id, describedBy }) => (
          <Textarea
            {...register('systemPrompt')}
            id={id}
            rows={5}
            aria-describedby={describedBy}
            invalid={Boolean(formState.errors.systemPrompt)}
          />
        )}
      </FormField>

      <div className="sm:col-span-2">
        <Controller
          control={control}
          name="escalateOnNegativeSentiment"
          render={({ field }) => (
            <SettingsToggleRow
              label="Escalar ante sentimiento negativo"
              description="Transfiere la conversación a un asesor humano cuando el cliente muestra frustración."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="sm:col-span-2">
        <Controller
          control={control}
          name="citeSources"
          render={({ field }) => (
            <SettingsToggleRow
              label="Citar fuentes de la base de conocimiento"
              description="Añade la referencia del recurso consultado al final de cada respuesta."
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
    </SettingsSection>
  );
}
