import { motion } from 'framer-motion';

import { CredentialField } from '@/components/forms/CredentialField';
import { Alert, Card } from '@/components/ui';
import { useProviderCredentialsForm } from '@/features/ai/hooks/useProviderCredentialsForm';
import { staggerItem } from '@/lib/motion';
import type { IProviderConnection, IProviderDefinition } from '@/types';
import { maskSecret } from '@/utils/mask-secret';
import { ProviderCardFooter } from './ProviderCardFooter';
import { ProviderCardHeader } from './ProviderCardHeader';

export interface IProviderCardProps {
  definition: IProviderDefinition;
  connection: IProviderConnection;
  autosave: boolean;
  onConnectionChange: (connection: IProviderConnection) => void;
}

const ALERT_TONES = {
  invalid: 'danger',
  incomplete: 'warning',
  connected: 'success',
} as const;

/** One provider, one card. All behaviour delegated to `useProviderCredentialsForm`. */
export function ProviderCard({
  definition,
  connection,
  autosave,
  onConnectionChange,
}: IProviderCardProps) {
  const { form, status, isDirty, isSaving, isTesting, isRestoring, onSave, onTest, onRestore } =
    useProviderCredentialsForm({ definition, connection, autosave, onConnectionChange });

  const alertTone = status in ALERT_TONES ? ALERT_TONES[status as keyof typeof ALERT_TONES] : null;

  // Preview of the stored key so the card is identifiable without revealing it.
  const secretField = definition.fields.find((field) => field.kind === 'secret');
  const storedSecret = secretField ? (connection.credentials[secretField.name] ?? '') : '';

  return (
    <motion.div variants={staggerItem}>
      <Card elevation="raised" className="overflow-hidden">
        <ProviderCardHeader
          definition={definition}
          status={status}
          latencyMs={connection.latencyMs}
          maskedSecret={storedSecret ? maskSecret(storedSecret) : undefined}
        />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
          noValidate
          autoComplete="off"
        >
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <CredentialField key={field.name} field={field} control={form.control} />
            ))}

            {alertTone && connection.message ? (
              <div className="sm:col-span-2">
                <Alert
                  tone={alertTone}
                  title={connection.message}
                  description={
                    status === 'invalid'
                      ? 'Genera una credencial nueva en el panel del proveedor y vuelve a probar la conexión.'
                      : undefined
                  }
                />
              </div>
            ) : null}
          </div>

          <ProviderCardFooter
            isDirty={isDirty}
            isSaving={isSaving}
            isTesting={isTesting}
            isRestoring={isRestoring}
            lastTestedAt={connection.lastTestedAt}
            onSave={onSave}
            onTest={onTest}
            onRestore={onRestore}
          />
        </form>
      </Card>
    </motion.div>
  );
}
