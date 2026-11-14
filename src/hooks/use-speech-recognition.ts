'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { parseSpokenAmount } from '@/lib/speech';

interface UseSpeechRecognitionOptions {
  /** Chamado quando o navegador entrega uma transcrição final com valor válido. */
  onAmount: (value: number, transcript: string) => void;
  lang?: string;
}

const MAX_AMOUNT = 99999.99;

/**
 * Entrada de voz via Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *
 * A API é nativa dos navegadores (Chrome, Edge, Safari) e exige HTTPS ou
 * localhost. Quando o recurso não existe, `supported` fica false e o botão
 * de microfone é desabilitado com uma explicação.
 */
export function useSpeechRecognition({
  onAmount,
  lang = 'pt-BR',
}: UseSpeechRecognitionOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onAmountRef = useRef(onAmount);
  onAmountRef.current = onAmount;

  useEffect(() => {
    setSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        'Entrada por voz indisponível neste navegador. Use o Chrome, Edge ou Safari.',
      );
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let text = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        text += event.results[index][0].transcript;
      }

      text = text.trim();
      setTranscript(text);

      const last = event.results[event.results.length - 1];
      if (!last?.isFinal) return;

      const amount = parseSpokenAmount(text);

      if (amount !== null && amount > 0 && amount <= MAX_AMOUNT) {
        onAmountRef.current(amount, text);
        setError(null);
      } else {
        setError(
          'Não entendi o valor. Diga, por exemplo: "oitenta e cinco reais e cinquenta centavos".',
        );
      }
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Permita o uso do microfone nas configurações do navegador.');
      } else if (event.error === 'no-speech') {
        setError('Não ouvi nada. Aproxime-se do microfone e tente novamente.');
      } else if (event.error === 'audio-capture') {
        setError('Nenhum microfone encontrado neste dispositivo.');
      } else if (event.error === 'network') {
        setError('Sem conexão para o reconhecimento de voz.');
      } else {
        setError('Não foi possível ouvir. Tente novamente.');
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      setError('Não foi possível iniciar o microfone. Tente novamente.');
    }
  }, [lang]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  };
}
