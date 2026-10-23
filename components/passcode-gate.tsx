"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

const CORRECT = "2668";
const DIGITS = 4;
const PIN_VERIFIED_KEY = "incorz_pin_verified";

export default function PasscodeGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState<string[]>(Array(DIGITS).fill(""));
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-unlock if editInvoice is in sessionStorage (coming from history page)
    if (typeof window !== "undefined") {
      const editInvoice = sessionStorage.getItem("editInvoice");
      if (editInvoice) {
        setUnlocked(true);
        return;
      }

      // Check if PIN was already verified in this session
      const pinVerified = sessionStorage.getItem(PIN_VERIFIED_KEY);
      if (pinVerified === "true") {
        setUnlocked(true);
        return;
      }
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
    } else if (digit && index === DIGITS - 1) {
      // Auto-submit when last digit is entered
      const full = next.join("");
      if (full.length === DIGITS) {
        setTimeout(() => submit(full), 100);
      }
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
      // PIN is correct - save verification to session storage and unlock
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PIN_VERIFIED_KEY, "true");
      }
      setUnlocked(true);
    } else {
      // PIN is incorrect - show error
      setShake(true);
      setError(true);
      setCode(Array(DIGITS).fill(""));
      setTimeout(() => {
        setShake(false);
        inputRefs.current[0]?.focus();
      }, 600);
    }
  }

  if (unlocked) return <>{children}</>;

  const title = "Enter Passcode";
  const subtitle = "This tool is protected. Enter your passcode to continue.";

  return (

    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#f3f4f6" }}
    >
      <div className="bg-white rounded-2xl shadow-lg border border-border px-10 py-12 flex flex-col items-center gap-8 w-full max-w-sm">
        {/* Logo */}
        <img
          src="/incorz-logo.svg"
          alt="Incorz"
          className="h-9 w-auto object-contain"
        />

        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-sm font-bold tracking-wide text-foreground">
            {title}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {subtitle}
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
              className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all cursor-pointer"
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
          className="w-full h-10 rounded-full text-xs font-bold text-white transition-opacity hover:opacity-90 active:opacity-75 cursor-pointer"
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
