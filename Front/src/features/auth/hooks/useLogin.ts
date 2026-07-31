import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { ROUTES } from '@/constants/routes';
import { loginSchema, type LoginFormType } from '@/schemas/auth.schema';
import { signIn } from '@/services/auth.service';

export interface ILoginState {
  form: UseFormReturn<LoginFormType>;
  isSubmitting: boolean;
  /** Server-side rejection, shown above the fields rather than under one. */
  formError: string | null;
  onSubmit: () => void;
}

export function useLogin(): ILoginState {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginFormType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setFormError(null);

    const result = await signIn(values);

    if (!result.ok) {
      setIsSubmitting(false);
      setFormError(result.error);
      form.setValue('password', '');
      form.setFocus('password');
      return;
    }

    // Full navigation on purpose: entering the app crosses a session boundary.
    window.location.assign(ROUTES.DASHBOARD);
  });

  return { form, isSubmitting, formError, onSubmit: () => void onSubmit() };
}
