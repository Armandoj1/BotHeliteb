import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchConversationMessages } from '@/services/conversation.service';
import type { IAsyncState, IMessage } from '@/types';

export interface IConversationMessagesState extends IAsyncState<IMessage[]> {
  reload: () => void;
}

const VACIO: IAsyncState<IMessage[]> = { data: null, status: 'loading', error: null };

/**
 * Trae el hilo completo de una conversación. El listado del inbox solo trae un
 * preview del último mensaje, así que sin esto el drawer se abría siempre vacío:
 * `toConversation` deja `messages: []` a propósito y nadie llamaba al endpoint.
 *
 * Se dispara al seleccionar una conversación y se descarta al cerrar el drawer,
 * para no dejar el hilo del contacto anterior en pantalla mientras carga el nuevo.
 */
export function useConversationMessages(telefono: string | null): IConversationMessagesState {
  const [state, setState] = useState<IAsyncState<IMessage[]>>(VACIO);
  // Evita que una respuesta lenta de una conversación ya cerrada pise a la actual.
  const vigenteRef = useRef<string | null>(null);

  const cargar = useCallback(async (objetivo: string) => {
    setState(VACIO);
    const result = await fetchConversationMessages(objetivo);
    if (vigenteRef.current !== objetivo) return;

    setState(
      result.ok
        ? { data: result.value, status: 'success', error: null }
        : { data: null, status: 'error', error: result.error },
    );
  }, []);

  useEffect(() => {
    vigenteRef.current = telefono;
    if (telefono === null) {
      setState(VACIO);
      return;
    }
    void cargar(telefono);
  }, [telefono, cargar]);

  const reload = useCallback(() => {
    if (telefono !== null) void cargar(telefono);
  }, [telefono, cargar]);

  return { ...state, reload };
}
