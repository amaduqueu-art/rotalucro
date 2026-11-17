'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'rrcl-assistant-voice';

/**
 * Fala as respostas do assistente com a voz nativa do sistema.
 *
 * A preferência de voz fica no localStorage. Sem suporte (ou com a voz
 * desligada), o assistente continua respondendo por texto.
 */
export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const available = 'speechSynthesis' in window;
    setSupported(available);

    try {
      setMuted(localStorage.getItem(STORAGE_KEY) === 'off');
    } catch {
      // Modo privado pode bloquear o storage: a voz segue ligada nesta visita.
    }

    if (!available) return;

    // Aquece a lista de vozes; no Chrome ela chega de forma assíncrona.
    const loadVoices = () => window.speechSynthesis.getVoices();
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || muted) return;

      const value = text.trim();
      if (!value) return;

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.03;
      utterance.pitch = 1;

      const voice = pickPortugueseVoice(synth.getVoices());
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synth.speak(utterance);
    },
    [muted, supported],
  );

  const toggleMuted = useCallback(() => {
    const next = !muted;
    setMuted(next);

    try {
      localStorage.setItem(STORAGE_KEY, next ? 'off' : 'on');
    } catch {
      // Sem storage, a escolha vale só enquanto a aba estiver aberta.
    }

    if (next) cancel();
  }, [muted, cancel]);

  return { supported, muted, speaking, speak, cancel, toggleMuted };
}

function pickPortugueseVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const portuguese = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith('pt'),
  );

  const brazilian = portuguese.filter((voice) =>
    voice.lang.toLowerCase().includes('br'),
  );

  const pool = brazilian.length > 0 ? brazilian : portuguese;

  return (
    pool.find((voice) => /google/i.test(voice.name)) ??
    pool.find((voice) =>
      /(luciana|maria|francisca|fernanda|joana|ines|ana)/i.test(voice.name),
    ) ??
    pool[0] ??
    null
  );
}
