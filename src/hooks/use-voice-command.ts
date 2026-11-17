'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVoiceCommandOptions {
  /** Recebe a transcrição final, já em texto, para interpretar o comando. */
  onResult: (text: string) => void;
  lang?: string;
}

/**
 * Ditado de comandos via Web Speech API (SpeechRecognition).
 *
 * Diferente do hook do formulário — que só aceita valores — este entrega a
 * frase inteira para o interpretador de comandos do assistente.
 */
export function useVoiceCommand({
  onResult,
  lang = 'pt-BR',
}: UseVoiceCommandOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        'Ditado indisponível neste navegador. Use o Chrome, Edge ou Safari.',
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
      setInterim('');
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let partial = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalText += text;
        } else {
          partial += text;
        }
      }

      if (partial) setInterim(partial.trim());

      if (finalText.trim()) {
        const text = finalText.trim();
        setInterim('');
        onResultRef.current(text);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      setInterim('');

      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Permita o uso do microfone nas configurações do navegador.');
      } else if (event.error === 'no-speech') {
        setError('Não ouvi nada. Aproxime-se do microfone e tente de novo.');
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
      setInterim('');
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
    interim,
    error,
    start,
    stop,
    toggle,
    clearError: () => setError(null),
  };
}
