import { Controller } from 'react-hook-form';

import { FormField, Input, Select } from '@/components/ui';
import { useSettingsSection } from '@/features/settings/hooks/useSettingsSection';
import { LOCALE_OPTIONS, TIMEZONE_OPTIONS } from '@/mocks/settings.mock';
import {
  workspaceSettingsSchema,
  type WorkspaceSettingsFormType,
} from '@/schemas/settings.schema';
import { SettingsSection } from './SettingsSection';

export interface IWorkspaceSettingsFormProps {
  defaultValues: WorkspaceSettingsFormType;
}

export function WorkspaceSettingsForm({ defaultValues }: IWorkspaceSettingsFormProps) {
  const { form, isSaving, isDirty, onSubmit, onReset } = useSettingsSection({
    section: 'workspace',
    schema: workspaceSettingsSchema,
    defaultValues,
    successTitle: 'Espacio de trabajo actualizado',
  });

  const { register, control, formState } = form;

  return (
    <SettingsSection
      title="Espacio de trabajo"
      description="Identidad del espacio y comportamiento general de las conversaciones."
      isDirty={isDirty}
      isSaving={isSaving}
      onSubmit={onSubmit}
      onReset={onReset}
    >
      <FormField label="Nombre del espacio" error={formState.errors.workspaceName?.message}>
        {({ id, describedBy }) => (
          <Input
            {...register('workspaceName')}
            id={id}
            aria-describedby={describedBy}
            tone={formState.errors.workspaceName ? 'invalid' : 'default'}
          />
        )}
      </FormField>

      <FormField
        label="Correo de soporte"
        hint="Se muestra al cliente cuando el asistente no puede resolver."
        error={formState.errors.supportEmail?.message}
      >
        {({ id, describedBy }) => (
          <Input
            {...register('supportEmail')}
            id={id}
            type="email"
            aria-describedby={describedBy}
            tone={formState.errors.supportEmail ? 'invalid' : 'default'}
          />
        )}
      </FormField>

      <FormField label="Zona horaria" error={formState.errors.timezone?.message}>
        {({ id }) => (
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select
                id={id}
                value={field.value}
                onValueChange={field.onChange}
                options={TIMEZONE_OPTIONS}
                aria-label="Zona horaria"
              />
            )}
          />
        )}
      </FormField>

      <FormField label="Idioma" error={formState.errors.locale?.message}>
        {({ id }) => (
          <Controller
            control={control}
            name="locale"
            render={({ field }) => (
              <Select
                id={id}
                value={field.value}
                onValueChange={field.onChange}
                options={LOCALE_OPTIONS}
                aria-label="Idioma"
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label="Cierre automático (minutos)"
        hint="Tiempo de inactividad antes de cerrar una conversación."
        error={formState.errors.autoCloseMinutes?.message}
      >
        {({ id, describedBy }) => (
          <Input
            {...register('autoCloseMinutes')}
            id={id}
            type="number"
            min={5}
            max={1440}
            aria-describedby={describedBy}
            tone={formState.errors.autoCloseMinutes ? 'invalid' : 'default'}
          />
        )}
      </FormField>
    </SettingsSection>
  );
}
