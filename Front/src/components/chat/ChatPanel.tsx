import { MessagesSquare } from 'lucide-react';

import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { MessageThread } from '@/components/conversations/MessageThread';
import { EmptyState, Skeleton, StatusDot, TooltipProvider } from '@/components/ui';
import { useChat } from '@/features/chat/hooks/useChat';
import { ChatComposer } from './ChatComposer';

/**
 * Island root for `/chat`: the advisor's own conversation with the assistant,
 * inside the panel. Customer threads are a different module (Conversaciones).
 */
export function ChatPanel() {
  const chat = useChat();

  return (
    <TooltipProvider delayDuration={280}>
      <div className="flex h-[calc(100dvh-var(--header-height)-3.5rem)] min-h-[28rem] w-full flex-col gap-4">
        <PageHeader
          title="Chat con el asistente"
          description="Habla con el mismo agente que responde por WhatsApp, sin salir del panel. Útil para probar respuestas, precios y disponibilidad antes de enviarlas a un cliente."
          actions={
            <p className="flex items-center gap-1.5 text-[12px] text-subtle">
              <StatusDot tone={chat.status === 'success' ? 'success' : 'neutral'} size="sm" />
              {chat.status === 'success' ? 'Conectado al agente' : 'Sin conexión'}
            </p>
          }
        />

        <AsyncBoundary
          status={chat.status}
          error={chat.error}
          onRetry={chat.reload}
          skeleton={<Skeleton shape="block" className="flex-1" />}
        >
          {chat.messages.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="Empieza la conversación"
              description="Pregunta por un producto, un precio o una condición comercial. El asistente responde con el catálogo y las notas del agente."
              className="flex-1"
            />
          ) : (
            <MessageThread messages={chat.messages} className="flex-1" />
          )}
        </AsyncBoundary>

        <ChatComposer
          isSending={chat.isSending}
          onSend={chat.send}
          disabled={chat.sessionId === null}
        />
      </div>
    </TooltipProvider>
  );
}
