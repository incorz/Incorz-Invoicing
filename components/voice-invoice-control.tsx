"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: VoiceRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceInvoiceControlProps {
  onCommand: (transcript: string) => void;
}

export default function VoiceInvoiceControl({ onCommand }: VoiceInvoiceControlProps) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || "";
      if (transcript) {
        onCommand(transcript);
        setMessage(`Applied: “${transcript}”`);
      }
    };
    recognition.onerror = () => {
      setMessage("I could not hear that. Please try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setMessage("Listening… say: Create an invoice for John for ITIN service");
    setListening(true);
    recognition.start();
  };

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
      <p className="hidden max-w-[220px] truncate text-[10px] text-muted-foreground sm:block" aria-live="polite">
        {message}
      </p>
      <Button
        type="button"
        variant={listening ? "default" : "outline"}
        size="sm"
        onClick={toggleListening}
        aria-label={listening ? "Stop voice input" : "Start voice invoice input"}
        className="h-8 shrink-0 gap-1.5 rounded-full px-3 text-[11px]"
        style={listening ? { background: "#e8000d" } : undefined}
      >
        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        {listening ? "Stop" : "Voice fill"}
      </Button>
    </div>
  );
}
