import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSessionUser } from '@/hooks/useSessionUser';
import { useToast } from '@/hooks/useToast';
import { buildSessionId, fetchChatHistory, sendChatMessage } from '@/services/chat.service';
import type { IMessage, RequestStatusType } from '@/types';

export interface IChatState {
  status: RequestStatusType;
  error: string | null;
  messages: readonly IMessage[];
  isSending: boolean;
  sessionId: string | null;
  reload: () => void;
  send: (content: string) => Promise<void>;
}

/**
 * A single conversation with the assistant, held inside the panel. There is no
 * thread list: the advisor talks to the agent, not to a roster of contacts —
 * customer threads live in Conversaciones.
 */
export function useChat(): IChatState {
  const user = useSessionUser();
  const toast = useToast();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [status, setStatus] = useState<RequestStatusType>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sessionId = useMemo(() => (user ? buildSessionId(user.id) : null), [user]);

  const reload = useCallback(async () => {
    if (!sessionId) return;

    setStatus('loading');
    const result = await fetchChatHistory(sessionId);

    if (!result.ok) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setMessages(result.value);
    setError(null);
    setStatus('success');
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const send = useCallback(
    async (content: string) => {
      if (!sessionId) return;

      // Echoed immediately: the agent can take seconds, and a message that
      // vanishes until the reply lands feels broken.
      const own: IMessage = {
        id: `${sessionId}-own-${Date.now()}`,
        author: 'user',
        authorName: 'Tú',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, own]);

      setIsSending(true);
      const result = await sendChatMessage(sessionId, content);
      setIsSending(false);

      if (!result.ok) {
        setMessages((current) => current.filter((message) => message.id !== own.id));
        toast.error({ title: 'No se pudo enviar el mensaje', description: result.error });
        return;
      }

      setMessages((current) => [...current, result.value]);
    },
    [sessionId, toast],
  );

  return { status, error, messages, isSending, sessionId, reload: () => void reload(), send };
}
