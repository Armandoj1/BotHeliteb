import { z, type ZodType } from 'zod';

import type { ICredentialField, IProviderDefinition, ProviderCredentialsType } from '@/types';

/**
 * Builds a Zod schema from a provider definition. One generator replaces eleven
 * hand-written schemas and guarantees the form, the validation and the payload
 * can never drift apart.
 */
export function buildCredentialsSchema(
  definition: IProviderDefinition,
): ZodType<ProviderCredentialsType> {
  const shape: Record<string, ZodType<string>> = {};

  for (const field of definition.fields) {
    shape[field.name] = buildFieldSchema(field);
  }

  return z.object(shape) as unknown as ZodType<ProviderCredentialsType>;
}

interface IFormatRule {
  test: (value: string) => boolean;
  message: string;
}

function buildFieldSchema(field: ICredentialField): ZodType<string> {
  const rules: IFormatRule[] = [];

  if (field.kind === 'url') {
    rules.push({
      test: (value) => /^https?:\/\/\S+$/i.test(value),
      message: 'Introduce una URL válida que empiece por http:// o https://',
    });
  }

  if (field.pattern) {
    const expression = new RegExp(field.pattern.source);
    rules.push({ test: (value) => expression.test(value), message: field.pattern.message });
  }

  if (field.minLength !== undefined) {
    const minLength = field.minLength;
    rules.push({
      test: (value) => value.length >= minLength,
      message: `Debe tener al menos ${minLength} caracteres.`,
    });
  }

  const base = field.required
    ? z.string().trim().min(1, { message: `${field.label} es obligatorio.` })
    : z.string().trim();

  // Format rules skip empty values so an untouched optional field stays valid.
  return rules.reduce<ZodType<string>>(
    (schema, rule) => schema.refine((value) => value === '' || rule.test(value), rule),
    base,
  );
}

/** Default form values so react-hook-form always starts fully controlled. */
export function buildEmptyCredentials(definition: IProviderDefinition): ProviderCredentialsType {
  return Object.fromEntries(definition.fields.map((field) => [field.name, '']));
}
