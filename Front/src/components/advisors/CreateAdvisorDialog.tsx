import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { SecretInput } from '@/components/forms/SecretInput';
import { Button, Dialog, FormField, Input } from '@/components/ui';
import { createAdvisorSchema, type CreateAdvisorFormType } from '@/schemas/advisor.schema';
import type { IAdvisor, ResultType } from '@/types';

export interface ICreateAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (
    payload: CreateAdvisorFormType,
  ) => Promise<ResultType<{ advisor: IAdvisor; temporaryPassword: string }>>;
}

/**
 * Two steps in one dialog: el formulario, y — solo si la creación funcionó —
 * la contraseña generada, que se muestra una única vez (no queda registrada
 * en ningún lado en texto plano, así que cerrar sin copiarla la pierde).
 */
export function CreateAdvisorDialog({ open, onOpenChange, onCreate }: ICreateAdvisorDialogProps) {
  const [created, setCreated] = useState<{ nombre: string; password: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState, reset } = useForm<CreateAdvisorFormType>({
    resolver: zodResolver(createAdvisorSchema),
    defaultValues: { nombre: '', email: '', telefono: '' },
  });

  function close() {
    onOpenChange(false);
    // Se limpia después de la animación de salida, no de inmediato, para no
    // ver el formulario "en blanco" parpadear mientras el diálogo se cierra.
    setTimeout(() => {
      setCreated(null);
      setFormError(null);
      reset();
    }, 200);
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await onCreate(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setCreated({ nombre: values.nombre, password: result.value.temporaryPassword });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(next) : close())}
      title={created ? 'Asesor creado' : 'Crear asesor'}
      description={
        created
          ? `Comparte esta contraseña con ${created.nombre} — no se puede volver a ver.`
          : 'Queda con acceso al panel de inmediato, con el rol de asesor normal.'
      }
      footer={
        created ? (
          <Button variant="primary" size="sm" onClick={close}>
            Listo, ya la copié
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" isLoading={formState.isSubmitting} onClick={() => void onSubmit()}>
              Crear asesor
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success-tint px-3.5 py-3 text-[13px] text-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
            {created.nombre} ya puede entrar al panel con su correo y esta contraseña.
          </div>
          <FormField label="Contraseña temporal">
            {({ id }) => (
              <SecretInput id={id} value={created.password} readOnly onFocus={(e) => e.target.select()} />
            )}
          </FormField>
        </div>
      ) : (
        <form onSubmit={(event) => event.preventDefault()} noValidate className="space-y-4">
          <FormField label="Nombre" error={formState.errors.nombre?.message}>
            {({ id, describedBy }) => (
              <Input
                {...register('nombre')}
                id={id}
                autoFocus
                placeholder="Nombre completo"
                aria-describedby={describedBy}
                tone={formState.errors.nombre ? 'invalid' : 'default'}
              />
            )}
          </FormField>

          <FormField label="Correo" error={formState.errors.email?.message}>
            {({ id, describedBy }) => (
              <Input
                {...register('email')}
                id={id}
                type="email"
                placeholder="nombre@heliteb.co"
                aria-describedby={describedBy}
                tone={formState.errors.email ? 'invalid' : 'default'}
              />
            )}
          </FormField>

          <FormField label="Teléfono" error={formState.errors.telefono?.message}>
            {({ id, describedBy }) => (
              <Input
                {...register('telefono')}
                id={id}
                placeholder="573001234567"
                aria-describedby={describedBy}
                tone={formState.errors.telefono ? 'invalid' : 'default'}
              />
            )}
          </FormField>

          {formError ? (
            <p role="alert" className="text-[13px] text-danger">
              {formError}
            </p>
          ) : null}
        </form>
      )}
    </Dialog>
  );
}
