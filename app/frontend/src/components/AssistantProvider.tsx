'use client';

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type { ListingSearchResult } from '@/lib/types';

/**
 * Guarda la conversación con el asistente mientras dura la visita.
 *
 * POR QUÉ VIVE ACÁ ARRIBA Y NO DENTRO DEL PANEL
 *
 *   El asistente tiene que sentirse un acompañante, no una ventanita que se
 *   reinicia sola. Si el estado viviera dentro del panel, pasar del muro a un
 *   aviso desmontaría el componente y borraría el hilo: la persona pregunta
 *   algo, entra a mirar el vehículo del que hablaban, y el asistente ya no se
 *   acuerda de nada.
 *
 *   Está en el layout, así que sobrevive a la navegación entre pantallas.
 *
 * NO SE GUARDA EN NINGÚN LADO. Al cerrar la pestaña, la conversación se
 * pierde. Fue una decisión: guardar conversaciones es buena parte de lo que
 * cuesta la mensajería del Sprint 5.
 */

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  /** Los avisos que el asistente encontró al responder, si buscó alguno. */
  results?: ListingSearchResult[];
}

interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  thinking: boolean;
  setThinking: (thinking: boolean) => void;
  /**
   * La respuesta que se está escribiendo en este momento, mientras llega.
   *
   * Vive acá arriba por la misma razón que la conversación: el panel se puede
   * cerrar mientras el asistente contesta —para mirar el aviso del que se está
   * hablando— y al volver a abrirlo la respuesta tiene que seguir donde iba, no
   * empezar de nuevo ni aparecer entera de golpe.
   */
  streamingText: string;
  setStreamingText: Dispatch<SetStateAction<string>>;
}

const AssistantContext = createContext<AssistantState | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  return (
    <AssistantContext.Provider
      value={{
        open,
        setOpen,
        messages,
        setMessages,
        thinking,
        setThinking,
        streamingText,
        setStreamingText,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantState {
  const context = useContext(AssistantContext);

  if (!context) {
    throw new Error('useAssistant se usó fuera de AssistantProvider.');
  }

  return context;
}
