'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useTTS(options: TTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState(options.rate || 1.0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !currentVoice) {
        const defaultVoice = voices.find((v) => v.lang.startsWith('en-US') && v.name.includes('Google')) || voices[0];
        setCurrentVoice(defaultVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [currentVoice]);

  const speak = useCallback(
    (text: string, onWordBoundary?: (charIndex: number) => void, onEnd?: () => void) => {
      if (!text || !window.speechSynthesis) return;

      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      if (currentVoice) {
        utterance.voice = currentVoice;
      }
      utterance.rate = rate;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
        setCurrentWordIndex(0);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
        if (onEnd) onEnd();
      };

      utterance.onpause = () => {
        setIsPaused(true);
        setIsPlaying(false);
      };

      utterance.onresume = () => {
        setIsPaused(false);
        setIsPlaying(true);
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentWordIndex(event.charIndex);
          if (onWordBoundary) onWordBoundary(event.charIndex);
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsPlaying(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [currentVoice, rate, options.pitch, options.volume]
  );

  const pause = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }, []);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentWordIndex(0);
    }
  }, []);

  const setVoice = useCallback((voiceURI: string) => {
    const voice = availableVoices.find((v) => v.voiceURI === voiceURI);
    if (voice) {
      setCurrentVoice(voice);
    }
  }, [availableVoices]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    isPaused,
    availableVoices,
    currentVoice,
    rate,
    currentWordIndex,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setVoice,
  };
}
