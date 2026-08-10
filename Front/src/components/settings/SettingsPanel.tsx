import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fetchSettings } from '@/services/settings.service';
import { AssistantSettingsForm } from './AssistantSettingsForm';
import { NotificationSettingsForm } from './NotificationSettingsForm';
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm';

/** Island root for `/settings`. */
export function SettingsPanel() {
  const settings = useAsyncResource(fetchSettings);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Preferencias del panel, comportamiento del asistente y notificaciones del equipo."
      />

      <AsyncBoundary
        status={settings.status}
        error={settings.error}
        onRetry={() => void settings.reload()}
        skeleton={
          <div className="space-y-4">
            <Skeleton shape="block" className="h-10 w-72" />
            <Skeleton shape="block" className="h-[420px]" />
          </div>
        }
      >
        {settings.data ? (
          <Tabs defaultValue="workspace" className="space-y-5">
            <TabsList>
              <TabsTrigger value="workspace">Espacio de trabajo</TabsTrigger>
              <TabsTrigger value="assistant">Asistente</TabsTrigger>
              <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            </TabsList>

            {/* Sin max-w: la pantalla es una consola de operaciones y dejaba media
                pantalla vacía a la derecha. El ancho de cada campo lo controla la
                grilla de SettingsSection, que agrega columnas en pantallas grandes
                en vez de estirar dos inputs kilométricos. */}
            <div>
              <TabsContent value="workspace">
                <WorkspaceSettingsForm defaultValues={settings.data.workspace} />
              </TabsContent>

              <TabsContent value="assistant">
                <AssistantSettingsForm defaultValues={settings.data.assistant} />
              </TabsContent>

              <TabsContent value="notifications">
                <NotificationSettingsForm defaultValues={settings.data.notifications} />
              </TabsContent>
            </div>
          </Tabs>
        ) : null}
      </AsyncBoundary>
    </div>
  );
}
