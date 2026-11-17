'use client';

import {
  Bot,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useRides } from '@/hooks/use-rides';
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis';
import { useVoiceCommand } from '@/hooks/use-voice-command';
import {
  buildAssistantReply,
  parseAssistantIntent,
  toSpeechText,
  type AssistantReply,
} from '@/lib/assistant';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const GREETING = `Olá! Sou o assistente do ${BRAND.shortName}. Pergunte sobre lucro, despesas ou quilômetros, ou diga "registrar corrida de 25 reais".`;

const SUGGESTIONS = [
  'Quanto lucrei hoje?',
  'Quanto gastei este mês?',
  'Quantos km rodei?',
  'Registrar corrida de 25 reais',
];

/**
 * Assistente de voz do app: interpreta comandos em português, responde por
 * texto e áudio e navega para a tela certa. Fica disponível em todas as
 * páginas autenticadas, acima da navegação inferior no celular.
 */
export function VoiceAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'assistant', text: GREETING },
  ]);
  const [input, setInput] = useState('');

  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const navigationTimer = useRef<number | null>(null);

  const { rides, error: ridesError, loading } = useRides({ enabled: open });
  const tts = useSpeechSynthesis();
  const { speak, cancel: cancelSpeech, muted, toggleMuted } = tts;

  const pushMessage = useCallback((role: ChatMessage['role'], text: string) => {
    const id = nextId.current;
    nextId.current += 1;
    setMessages((previous) => [...previous, { id, role, text }]);
  }, []);

  const handleCommand = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;

      pushMessage('user', text);

      const intent = parseAssistantIntent(text);
      const result: AssistantReply =
        intent.kind === 'summary' && rides === null
          ? {
              reply: ridesError
                ? `Não consegui carregar suas corridas: ${ridesError}`
                : 'Só um instante: ainda estou carregando suas corridas. Tente novamente em alguns segundos.',
            }
          : buildAssistantReply(intent, rides);

      pushMessage('assistant', result.reply);
      speak(toSpeechText(result.reply));

      if (!result.action) return;

      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current);
      }

      navigationTimer.current = window.setTimeout(() => {
        navigationTimer.current = null;
        setOpen(false);

        if (result.action?.type === 'navigate') {
          router.push(result.action.href);
          return;
        }

        const fare = result.action?.type === 'register' ? result.action.fare : null;
        router.push(
          fare !== null ? `/registrar?valor=${fare.toFixed(2)}` : '/registrar',
        );
      }, 800);
    },
    [pushMessage, rides, ridesError, router, speak],
  );

  const speech = useVoiceCommand({ onResult: handleCommand });
  const { stop: stopListening } = speech;

  const handleClose = useCallback(() => {
    setOpen(false);
    stopListening();
    cancelSpeech();

    if (navigationTimer.current !== null) {
      window.clearTimeout(navigationTimer.current);
      navigationTimer.current = null;
    }
  }, [cancelSpeech, stopListening]);

  useEffect(
    () => () => {
      if (navigationTimer.current !== null) {
        window.clearTimeout(navigationTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open, speech.interim]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    setInput('');
    handleCommand(value);
  }

  function handleSuggestion(suggestion: string) {
    handleCommand(suggestion);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir assistente de voz"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'fixed bottom-[5.5rem] right-4 z-50 flex h-14 items-center gap-2 rounded-full bg-accent px-4 text-accent-foreground shadow-raised transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:bottom-6 md:right-6',
          open && 'pointer-events-none opacity-0',
        )}
      >
        <Sparkles className="size-5" aria-hidden="true" />
        <span className="text-sm font-bold">Assistente</span>
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title="Assistente RotaRenda"
        description="Fale ou digite. Eu consulto seus números e abro a tela certa."
        className="sm:max-w-lg"
      >
        <div className="space-y-4">
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Conversa com o assistente"
            className="no-scrollbar max-h-[38dvh] space-y-3 overflow-y-auto pr-1"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' && 'justify-end',
                )}
              >
                {message.role === 'assistant' ? (
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Bot className="size-4" aria-hidden="true" />
                  </span>
                ) : null}

                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    message.role === 'assistant'
                      ? 'rounded-tl-sm bg-secondary text-secondary-foreground'
                      : 'rounded-br-sm bg-primary text-primary-foreground',
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {speech.listening ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex size-2 animate-pulse rounded-full bg-accent" />
                {speech.interim || 'Ouvindo...'}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              {loading ? (
                <>
                  <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  Carregando suas corridas...
                </>
              ) : (
                'Dados atualizados ao abrir o assistente.'
              )}
            </span>
            <button
              type="button"
              onClick={toggleMuted}
              aria-pressed={muted}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {muted ? (
                <VolumeX className="size-3.5" aria-hidden="true" />
              ) : (
                <Volume2 className="size-3.5" aria-hidden="true" />
              )}
              {muted ? 'Voz desligada' : 'Voz ligada'}
            </button>
          </div>

          {ridesError && !loading ? (
            <p role="alert" className="text-xs font-medium text-destructive">
              {ridesError}
            </p>
          ) : null}

          {speech.error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {speech.error}
            </p>
          ) : null}

          {!speech.supported ? (
            <p className="rounded-xl border bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              O ditado não está disponível neste navegador. Use o Chrome, Edge
              ou Safari, ou digite o comando abaixo.
            </p>
          ) : null}

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestion(suggestion)}
                className="shrink-0 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                size="lg"
                variant={speech.listening ? 'accent' : 'default'}
                onClick={speech.toggle}
                disabled={!speech.supported}
                aria-pressed={speech.listening}
                className="flex-1"
              >
                {speech.listening ? (
                  <MicOff aria-hidden="true" />
                ) : (
                  <Mic aria-hidden="true" />
                )}
                {speech.listening ? 'Parar de ouvir' : 'Falar com o assistente'}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={toggleMuted}
                aria-label={muted ? 'Ligar respostas faladas' : 'Desligar respostas faladas'}
                title={muted ? 'Ligar voz' : 'Desligar voz'}
                className="size-12"
              >
                {muted ? (
                  <VolumeX aria-hidden="true" />
                ) : (
                  <Volume2 aria-hidden="true" />
                )}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ou digite: quanto lucrei hoje?"
                aria-label="Digite um comando para o assistente"
                autoComplete="off"
                className="h-12"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Enviar comando"
                className="size-12 shrink-0"
              >
                <Send aria-hidden="true" />
              </Button>
            </form>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ditado e voz processados pelo navegador. Seus valores continuam
            salvos no Supabase e visíveis só para você.
          </p>
        </div>
      </Modal>
    </>
  );
}
