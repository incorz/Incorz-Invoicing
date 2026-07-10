"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

const CORRECT = "2668";
const DIGITS = 4;
const PIN_STORAGE_KEY = "buzz_filing_pin_saved";

export default function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSavedThisSession, setPinSavedThisSession] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-unlock if editInvoice is in sessionStorage (coming from history page)
    if (typeof window !== "undefined") {
      const editInvoice = sessionStorage.getItem("editInvoice");
      if (editInvoice) {
        setUnlocked(true);
        return;
      }

      // Check if PIN was already saved in this session
      const pinSaved = sessionStorage.getItem(PIN_STORAGE_KEY);
      if (pinSaved === "true") {
        setUnlocked(true);
        return;
      }

      // First time - show PIN setup option
      setShowPinSetup(true);
    }
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError(false);

    if (digit && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
    if (digit && index === DIGITS - 1) {
      const full = [...next].join("");
      if (full.length === DIGITS) submit(full);
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      submit(code.join(""));
    }
  }

  function submit(full: string) {
    if (full === CORRECT) {
      setUnlocked(true);
    } else {
      setShake(true);
      setError(true);
      setCode(Array(DIGITS).fill(""));
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  }

  function handleRememberPin() {
    if (typeof window !== "undefined") {
      // Save PIN to session storage to skip passcode on subsequent loads
      sessionStorage.setItem(PIN_STORAGE_KEY, "true");
      setPinSavedThisSession(true);
    }
    setShowPinSetup(false);
    setUnlocked(true);
  }

  function handleSkipPin() {
    // Just proceed without saving PIN
    setShowPinSetup(false);
  }

  if (unlocked) return <>{children}</>;

  // Show PIN setup prompt on first visit
  if (showPinSetup && !pinSavedThisSession) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#f3f4f6" }}
      >
        <div className="bg-white rounded-2xl shadow-lg border border-border px-10 py-12 flex flex-col items-center gap-8 w-full max-w-sm">
          {/* Logo */}
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png"
            alt="Buzz Filing"
            className="h-9 w-auto object-contain"
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-sm font-bold tracking-wide text-foreground">
              Save Your Access
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Would you like to skip the passcode on your next visit?
            </p>
          </div>

          <div className="w-full space-y-3">
            <Button
              onClick={handleRememberPin}
              className="w-full h-10 rounded-full text-xs font-bold text-white cursor-pointer"
              style={{ background: "#e8000d" }}
            >
              Remember PIN for This Session
            </Button>
            <Button
              onClick={handleSkipPin}
              variant="outline"
              className="w-full h-10 rounded-full text-xs font-bold cursor-pointer"
            >
              Enter Passcode Now
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Your session will be remembered until you close the browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#f3f4f6" }}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-border px-10 py-12 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Logo */}
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png"
          alt="Buzz Filing"
          className="h-9 w-auto object-contain"
        />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-sm font-bold tracking-wide text-foreground">
            Enter Passcode
          </h1>
          <p className="text-[11px] text-muted-foreground">
            This tool is protected. Enter your passcode to continue.
          </p>
        </div>

        {/* PIN inputs */}
        <div
          className={`flex gap-3 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
          style={shake ? { animation: "shake 0.5s ease-in-out" } : {}}
        >
          {Array(DIGITS).fill(null).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={code[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all"
              style={{
                borderColor: error ? "#e8000d" : code[i] ? "#e8000d" : "#e8e8e8",
                color: "#000000",
                background: code[i] ? "#fff1f2" : "#ffffff",
              }}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-[11px] font-semibold" style={{ color: "#e8000d" }}>
            Incorrect passcode. Please try again.
          </p>
        )}

        {/* Submit */}
        <button
          onClick={() => submit(code.join(""))}
          className="w-full h-10 rounded-full text-xs font-bold text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ background: "#e8000d" }}
        >
          Unlock
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
