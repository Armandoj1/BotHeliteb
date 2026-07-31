import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { ZodType } from 'zod';

import { useToast } from '@/hooks/useToast';
import { saveSettingsSection, type IWorkspaceSettingsBundle } from '@/services/settings.service';

export interface IUseSettingsSectionOptions<T extends FieldValues> {
  section: keyof IWorkspaceSettingsBundle;
  schema: ZodType<T>;
  defaultValues: T;
  successTitle: string;
}

export interface ISettingsSectionState<T extends FieldValues> {
  form: UseFormReturn<T>;
  isSaving: boolean;
  isDirty: boolean;
  onSubmit: () => void;
  onReset: () => void;
}

/**
 * Every settings card behaves identically: validate, persist, toast, mark clean.
 * Written once and parameterised by schema, so each section stays declarative.
 */
export function useSettingsSection<T extends FieldValues>({
  section,
  schema,
  defaultValues,
  successTitle,
}: IUseSettingsSectionOptions<T>): ISettingsSectionState<T> {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<T>,
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true);
    const result = await saveSettingsSection(section, values);
    setIsSaving(false);

    if (!result.ok) {
      toast.error({ title: 'No se pudieron guardar los cambios', description: result.error });
      return;
    }

    form.reset(values as DefaultValues<T>);
    toast.success({ title: successTitle, description: 'Los cambios ya están activos.' });
  });

  const onReset = useCallback(() => {
    form.reset(defaultValues as DefaultValues<T>);
  }, [form, defaultValues]);

  return {
    form,
    isSaving,
    isDirty: form.formState.isDirty,
    onSubmit: () => void onSubmit(),
    onReset,
  };
}
