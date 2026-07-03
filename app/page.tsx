"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InvoiceForm from "@/components/invoice-form";
import InvoicePreview from "@/components/invoice-preview";
import PasscodeGate from "@/components/passcode-gate";
import { InvoiceData, DEFAULT_INVOICE } from "@/lib/invoice-types";

const FORM_DATA_KEY = "buzz_filing_form_data";

function loadFormData(): InvoiceData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FORM_DATA_KEY);
    return raw ? (JSON.parse(raw) as InvoiceData) : null;
  } catch {
    return null;
  }
}

function saveFormData(data: InvoiceData) {
  if (typeof window !== "undefined") {
    // Never persist invoiceNumber — always sourced from MongoDB
    const { invoiceNumber: _ignored, ...rest } = data;
    localStorage.setItem(FORM_DATA_KEY, JSON.stringify(rest));
  }
}

export default function Home() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(() => ({
    ...DEFAULT_INVOICE,
    invoiceNumber: 2100,
  }));

  const [mounted, setMounted] = useState(false);
  const [invoiceNumLoading, setInvoiceNumLoading] = useState(true);
  const downloadingRef = useRef(false);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = loadFormData();
    // Restore form data but NEVER restore invoiceNumber from localStorage
    if (saved) {
      const { invoiceNumber: _ignored, ...rest } = saved;
      setInvoiceData((prev) => ({ ...prev, ...rest }));
    }

    // Always get invoice number from MongoDB
    fetch("/api/invoice-number")
      .then((r) => r.json())
      .then(({ invoiceNumber }) => {
        if (typeof invoiceNumber === "number") {
          setInvoiceData((prev) => ({ ...prev, invoiceNumber }));
        }
      })
      .catch(() => {
        setInvoiceData((prev) => ({ ...prev, invoiceNumber: 2100 }));
      })
      .finally(() => setInvoiceNumLoading(false));
  }, []);

  useEffect(() => {
    if (mounted) {
      saveFormData(invoiceData);
    }
  }, [invoiceData, mounted]);

  const handleDownload = useCallback(async () => {
    if (downloadingRef.current) return; // prevent double-fire
    if (!invoiceData.billTo.trim()) {
      alert("Please enter a client name (Bill To) before downloading.");
      return;
    }
    if (invoiceData.lineItems.every((i) => !i.description.trim())) {
      alert("Please add at least one service description before downloading.");
      return;
    }
    downloadingRef.current = true;

    const el = document.getElementById("invoice-preview");
    if (!el) return;

    const { toJpeg } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const imgData = await toJpeg(el, {
      quality: 1.0,
      pixelRatio: 5,
      backgroundColor: "#ffffff",
      skipFonts: false,
    });

    const A4_W = 210;
    const A4_H = 297;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, A4_W, A4_H, undefined, "FAST");

    const resolvedName = `${invoiceData.billTo.trim()} - ${invoiceData.serviceType} - Invoice ${invoiceData.invoiceNumber}`;
    pdf.save(`${resolvedName}.pdf`);

    // Increment counter in MongoDB and update local state with new number
    fetch("/api/invoice-number", { method: "POST" })
      .then((r) => r.json())
      .then(({ invoiceNumber }) => {
        if (typeof invoiceNumber === "number") {
          setInvoiceData((prev) => ({ ...prev, invoiceNumber }));
        }
      })
      .catch(() => {
        setInvoiceData((prev) => ({ ...prev, invoiceNumber: prev.invoiceNumber + 1 }));
      })
      .finally(() => { downloadingRef.current = false; });
  }, [invoiceData]);

  const handleReset = useCallback(() => {
    const fresh: InvoiceData = {
      ...DEFAULT_INVOICE,
      lineItems: [
        {
          id: crypto.randomUUID(),
          description: "",
          qty: 1,
          rate: 0,
        },
      ],
    };

    // Fetch current number from MongoDB for the reset form
    fetch("/api/invoice-number")
      .then((r) => r.json())
      .then(({ invoiceNumber }) => {
        setInvoiceData({ ...fresh, invoiceNumber: typeof invoiceNumber === "number" ? invoiceNumber : DEFAULT_INVOICE.invoiceNumber });
      })
      .catch(() => setInvoiceData(fresh));

    if (typeof window !== "undefined") {
      localStorage.removeItem(FORM_DATA_KEY);
    }
  }, []);

  return (
    <PasscodeGate>
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png"
            alt="Buzz Filing"
            className="h-8 w-auto object-contain flex-shrink-0"
          />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground hidden sm:block">
            Invoice Generator
          </span>
          <span
            className="text-[10px] font-bold text-white px-3 py-1 rounded-full tabular-nums flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }}
          >
            #{invoiceData.invoiceNumber}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left: Form */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] flex-shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-border">
          <InvoiceForm
            data={invoiceData}
            setData={setInvoiceData}
            onDownload={handleDownload}
            onReset={handleReset}
            invoiceNumLoading={invoiceNumLoading}
          />
        </aside>

        {/* Right: Preview */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10" style={{ background: "#f3f4f6" }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full inline-block" style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }} />
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#0d0f1a" }}>
                Live Preview
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground bg-white border border-border px-2.5 py-1 rounded-full">
              Updates automatically
            </span>
          </div>
          {/* Horizontally scrollable on small screens, centered on large */}
          <div className="overflow-x-auto pb-4">
            <div className="mx-auto" style={{ width: "794px" }}>
              <InvoicePreview ref={previewRef} data={invoiceData} />
            </div>
          </div>
        </main>

      </div>
    </div>
    </PasscodeGate>
  );
}
