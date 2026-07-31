import { Controller, type Control } from 'react-hook-form';

import { FormField, Input, Select } from '@/components/ui';
import type { ICredentialField, ProviderCredentialsType } from '@/types';
import { SecretInput } from './SecretInput';

export interface ICredentialFieldProps {
  field: ICredentialField;
  control: Control<ProviderCredentialsType>;
}

/**
 * Renders one credential input from its declarative definition. This is the only
 * component that knows how a field kind maps to a control, which is why adding a
 * provider never requires writing a form.
 */
export function CredentialField({ field, control }: ICredentialFieldProps) {
  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: controllerField, fieldState }) => (
        <FormField
          label={field.label}
          hint={field.helpText}
          error={fieldState.error?.message}
          optional={!field.required}
          className={field.span === 'half' ? 'sm:col-span-1' : 'sm:col-span-2'}
        >
          {({ id, describedBy }) => {
            const invalid = Boolean(fieldState.error);

            if (field.kind === 'select') {
              return (
                <Select
                  id={id}
                  value={controllerField.value ?? ''}
                  onValueChange={controllerField.onChange}
                  options={field.options ?? []}
                  invalid={invalid}
                  aria-label={field.label}
                />
              );
            }

            if (field.kind === 'secret') {
              return (
                <SecretInput
                  {...controllerField}
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  tone={invalid ? 'invalid' : 'default'}
                  placeholder={field.placeholder}
                />
              );
            }

            return (
              <Input
                {...controllerField}
                id={id}
                type={field.kind === 'url' ? 'url' : 'text'}
                inputMode={field.kind === 'url' ? 'url' : undefined}
                // Same reason as SecretInput: these are machine credentials, not
                // anything the browser's identity autofill should touch.
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore
                spellCheck={false}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                tone={invalid ? 'invalid' : 'default'}
                placeholder={field.placeholder}
                className={field.kind === 'url' ? 'font-mono text-[12.5px]' : undefined}
              />
            );
          }}
        </FormField>
      )}
    />
  );
}
