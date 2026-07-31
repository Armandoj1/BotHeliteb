import type {
  AssistantSettingsFormType,
  NotificationSettingsFormType,
  WorkspaceSettingsFormType,
} from '@/schemas/settings.schema';
import type { ISelectOption } from '@/types';

export const MOCK_WORKSPACE_SETTINGS: WorkspaceSettingsFormType = {
  workspaceName: 'HELITEB',
  supportEmail: 'soporte@heliteb.com.co',
  timezone: 'America/Mexico_City',
  locale: 'es-MX',
  autoCloseMinutes: 120,
};

export const MOCK_ASSISTANT_SETTINGS: AssistantSettingsFormType = {
  temperature: '0.4',
  maxTokens: 4_096,
  fallbackProvider: 'anthropic',
  systemPrompt:
    'Eres el asistente comercial de HELITEB. Responde en español neutro, con precisión técnica y sin prometer plazos que no puedas verificar en el catálogo.',
  escalateOnNegativeSentiment: true,
  citeSources: true,
};

export const MOCK_NOTIFICATION_SETTINGS: NotificationSettingsFormType = {
  emailDigest: true,
  escalationAlerts: true,
  syncFailures: true,
  quotaWarnings: true,
  weeklyReport: false,
};

export const TIMEZONE_OPTIONS: ISelectOption[] = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+2)' },
];

export const LOCALE_OPTIONS: ISelectOption[] = [
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'es-CO', label: 'Español (Colombia)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'en-US', label: 'English (United States)' },
];

export const TEMPERATURE_OPTIONS: ISelectOption[] = [
  { value: '0.1', label: 'Determinista', description: 'Respuestas consistentes y literales' },
  { value: '0.4', label: 'Equilibrado', description: 'Recomendado para atención comercial' },
  { value: '0.7', label: 'Creativo', description: 'Mayor variedad en la redacción' },
  { value: '1.0', label: 'Exploratorio', description: 'Solo para pruebas internas' },
];

export const NOTIFICATION_DESCRIPTIONS: Record<keyof NotificationSettingsFormType, string> = {
  emailDigest: 'Resumen diario de conversaciones y cotizaciones por correo.',
  escalationAlerts: 'Aviso inmediato cuando el asistente escala a un humano.',
  syncFailures: 'Alerta cuando un origen de datos falla o queda degradado.',
  quotaWarnings: 'Aviso al superar el 80% del consumo de tokens del plan.',
  weeklyReport: 'Informe semanal de desempeño del equipo y del asistente.',
};

export const NOTIFICATION_LABELS: Record<keyof NotificationSettingsFormType, string> = {
  emailDigest: 'Resumen diario',
  escalationAlerts: 'Alertas de escalamiento',
  syncFailures: 'Fallos de sincronización',
  quotaWarnings: 'Avisos de consumo',
  weeklyReport: 'Informe semanal',
};
