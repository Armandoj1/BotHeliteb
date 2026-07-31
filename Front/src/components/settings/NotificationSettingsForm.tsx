import { Controller } from 'react-hook-form';

import { useSettingsSection } from '@/features/settings/hooks/useSettingsSection';
import { NOTIFICATION_DESCRIPTIONS, NOTIFICATION_LABELS } from '@/mocks/settings.mock';
import {
  notificationSettingsSchema,
  type NotificationSettingsFormType,
} from '@/schemas/settings.schema';
import { SettingsSection } from './SettingsSection';
import { SettingsToggleRow } from './SettingsToggleRow';

const NOTIFICATION_KEYS = Object.keys(NOTIFICATION_LABELS) as Array<
  keyof NotificationSettingsFormType
>;

export interface INotificationSettingsFormProps {
  defaultValues: NotificationSettingsFormType;
}

export function NotificationSettingsForm({ defaultValues }: INotificationSettingsFormProps) {
  const { form, isSaving, isDirty, onSubmit, onReset } = useSettingsSection({
    section: 'notifications',
    schema: notificationSettingsSchema,
    defaultValues,
    successTitle: 'Preferencias de notificación actualizadas',
  });

  return (
    <SettingsSection
      title="Notificaciones"
      description="Elige qué eventos merecen interrumpirte y cuáles pueden esperar al resumen."
      isDirty={isDirty}
      isSaving={isSaving}
      onSubmit={onSubmit}
      onReset={onReset}
    >
      {NOTIFICATION_KEYS.map((key) => (
        <div key={key} className="sm:col-span-2">
          <Controller
            control={form.control}
            name={key}
            render={({ field }) => (
              <SettingsToggleRow
                label={NOTIFICATION_LABELS[key]}
                description={NOTIFICATION_DESCRIPTIONS[key]}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
      ))}
    </SettingsSection>
  );
}
