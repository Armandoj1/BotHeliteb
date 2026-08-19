import { useEffect, useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  fetchPromptPersona,
  restorePromptPersona,
  savePromptPersona,
} from '@/services/prompt-persona.service';

export function PromptPersonaPanel() {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [contenido, setContenido] = useState('');
  const [contenidoGuardado, setContenidoGuardado] = useState('');
  const [personalizado, setPersonalizado] = useState(false);
  const [contenidoPorDefecto, setContenidoPorDefecto] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  useEffect(() => {
    let active = true;

    fetchPromptPersona().then((result) => {
      if (!active) return;
      if (result.ok) {
        setContenido(result.value.contenido);
        setContenidoGuardado(result.value.contenido);
        setPersonalizado(result.value.personalizado);
        setContenidoPorDefecto(result.value.contenido_por_defecto);
      } else {
        toast.error({
          title: 'No se pudo cargar la persona de venta',
          description: 'Intenta recargar la página.',
        });
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = contenido !== contenidoGuardado;

  async function onGuardar() {
    setIsSaving(true);
    const result = await savePromptPersona(contenido);
    setIsSaving(false);

    if (result.ok) {
      setContenidoGuardado(contenido);
      setPersonalizado(true);
      toast.success({ title: 'Persona de venta guardada' });
    } else {
      toast.error({ title: 'No se pudo guardar', description: 'Intenta de nuevo en unos segundos.' });
    }
  }

  async function onConfirmarRestaurar() {
    setIsRestoring(true);
    const result = await restorePromptPersona();
    setIsRestoring(false);
    setConfirmRestoreOpen(false);

    if (result.ok) {
      setContenido(contenidoPorDefecto);
      setContenidoGuardado(contenidoPorDefecto);
      setPersonalizado(false);
      toast.success({ title: 'Persona de venta restaurada al valor predeterminado' });
    } else {
      toast.error({ title: 'No se pudo restaurar' });
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Persona de venta — WhatsApp</CardTitle>
          {!isLoading && (
            <Badge tone={personalizado ? 'primary' : 'neutral'}>
              {personalizado ? 'Personalizada' : 'Valor predeterminado'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Cómo se presenta el asistente, su tono, cómo conduce la conversación y cómo cierra la venta
          por WhatsApp. Las reglas técnicas (cotizaciones, seguimiento en el CRM) no viven aquí — están
          fijas en el código para que un cambio de estilo nunca pueda romper una integración.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Textarea
            value={contenido}
            onChange={(event) => setContenido(event.target.value)}
            rows={18}
            className="font-mono text-[13px] leading-relaxed"
            aria-label="Persona de venta"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="text-[12px] text-subtle" aria-live="polite">
            {isDirty ? 'Cambios sin guardar' : 'Todo guardado'}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isLoading || !personalizado}
              onClick={() => setConfirmRestoreOpen(true)}
            >
              Restaurar predeterminado
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              disabled={isLoading || !isDirty}
              onClick={onGuardar}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmRestoreOpen}
        onOpenChange={setConfirmRestoreOpen}
        title="¿Restaurar la persona de venta?"
        description="Se descarta la personalización guardada y el asistente vuelve al texto por defecto. Puedes volver a personalizarla cuando quieras."
        confirmLabel="Restaurar"
        destructive
        isLoading={isRestoring}
        onConfirm={onConfirmarRestaurar}
      />
    </Card>
  );
}
