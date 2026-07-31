import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { Controller } from 'react-hook-form';

import { SecretInput } from '@/components/forms/SecretInput';
import { Button, FormField, Input, Switch } from '@/components/ui';
import { useLogin } from '@/features/auth/hooks/useLogin';
import { TRANSITION } from '@/lib/motion';

export function LoginForm() {
  const { form, isSubmitting, formError, onSubmit } = useLogin();
  const { register, control, formState } = form;

  return (
    <form
      // `method="post"` is a safety net, not a real submission target: if the
      // island has not hydrated yet, the browser's native submit would default
      // to GET and put the password in the query string.
      method="post"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
      className="space-y-4"
    >
      <AnimatePresence initial={false}>
        {formError ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.base}
          >
            <p
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger-tint px-3.5 py-3 text-[13px] text-foreground"
            >
              <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden />
              {formError}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <FormField label="Correo corporativo" error={formState.errors.email?.message}>
        {({ id, describedBy }) => (
          <Input
            {...register('email')}
            id={id}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="tu.nombre@empresa.com"
            aria-describedby={describedBy}
            inputSize="lg"
            tone={formState.errors.email ? 'invalid' : 'default'}
          />
        )}
      </FormField>

      <FormField
        label="Contraseña"
        error={formState.errors.password?.message}
        action={
          <a
            href="#recuperar"
            className="rounded-xs text-[12px] text-muted transition-colors hover:text-foreground"
          >
            ¿La olvidaste?
          </a>
        }
      >
        {({ id, describedBy }) => (
          <SecretInput
            {...register('password')}
            id={id}
            autoComplete="current-password"
            allowCopy={false}
            placeholder="••••••••"
            aria-describedby={describedBy}
            inputSize="lg"
            tone={formState.errors.password ? 'invalid' : 'default'}
          />
        )}
      </FormField>

      <div className="flex items-center gap-2.5 pt-1">
        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <Switch
              id="login-remember"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Mantener la sesión abierta"
            />
          )}
        />
        <label htmlFor="login-remember" className="cursor-pointer text-[13px] text-muted">
          Mantener la sesión abierta 30 días
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        isLoading={isSubmitting}
        rightIcon={<ArrowRight aria-hidden />}
        className="mt-2"
      >
        Entrar al panel
      </Button>
    </form>
  );
}
