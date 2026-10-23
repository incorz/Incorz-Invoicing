"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InvoiceForm from "@/components/invoice-form";
import InvoicePreview from "@/components/invoice-preview";
import PasscodeGate from "@/components/passcode-gate";
import { SaveInvoiceModal } from "@/components/save-invoice-modal";
import { InvoiceData, DEFAULT_INVOICE } from "@/lib/invoice-types";

const FORM_DATA_KEY = "incorz_form_data";

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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [emailStatusMessage, setEmailStatusMessage] = useState("");
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

    // Save the invoice to MongoDB on download so every downloaded invoice is persisted
    try {
      await fetch("/api/invoices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
    } catch (error) {
      console.error("[v0] Failed to save invoice on download:", error);
    }

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
      invoiceNumber: 2100,
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
        setInvoiceData({ ...fresh, invoiceNumber: typeof invoiceNumber === "number" ? invoiceNumber : 2100 });
      })
      .catch(() => setInvoiceData(fresh));

    if (typeof window !== "undefined") {
      localStorage.removeItem(FORM_DATA_KEY);
    }
  }, []);

  const handleCreateNew = useCallback(() => {
    // Exit edit mode and create a fresh invoice
    setIsEditMode(false);
    handleReset();
  }, [handleReset]);

  const handleSave = useCallback(() => {
    setSaveModalOpen(true);
  }, []);

  const handleSendInvoice = useCallback(async () => {
    if (!invoiceData.clientEmail?.trim()) {
      setEmailStatus("error");
      setEmailStatusMessage("Please enter the client email address first.");
      return;
    }
    const preview = document.getElementById("invoice-preview");
    if (!preview) {
      setEmailStatus("error");
      setEmailStatusMessage("Invoice preview is not ready yet.");
      return;
    }

    setEmailStatus("sending");
    setEmailStatusMessage("Preparing your invoice PDF and sending the email...");
    try {
      const { toJpeg } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");
      const image = await toJpeg(preview, {
        quality: 1,
        pixelRatio: 5,
        backgroundColor: "#ffffff",
        skipFonts: false,
      });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(image, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      const response = await fetch("/api/invoices/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceData,
          customerName: invoiceData.billTo.trim(),
          pdfBase64,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send invoice");
      setEmailStatus("success");
      setEmailStatusMessage(`Invoice sent successfully to ${invoiceData.clientEmail}.`);
    } catch (error) {
      setEmailStatus("error");
      setEmailStatusMessage(error instanceof Error ? error.message : "Unable to send invoice");
    }
  }, [invoiceData]);

  const handleSaveWithDetails = useCallback(
    async (details: { teamMember: string; description: string }) => {
      setIsSaving(true);
      try {
        const saveData = {
          ...invoiceData,
          teamMember: details.teamMember,
          invoiceDescription: details.description,
        };

        const res = await fetch("/api/invoices/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saveData),
        });

        if (res.ok) {
          const data = await res.json();
          alert("Invoice saved successfully!");
          setSaveModalOpen(false);
        } else {
          const errorData = await res.json().catch(() => ({}));
          alert("Failed to save invoice: " + (errorData.error || "Unknown error"));
        }
      } catch (error) {
        console.error("[v0] Failed to save invoice:", error);
        alert("Failed to save invoice: " + (error instanceof Error ? error.message : "Unknown error"));
      } finally {
        setIsSaving(false);
      }
    },
    [invoiceData]
  );

  useEffect(() => {
    // Check if there's an invoice to edit from history
    if (typeof window !== "undefined" && mounted) {
      const editInvoice = sessionStorage.getItem("editInvoice");
      const duplicateInvoice = sessionStorage.getItem("duplicateInvoice");
      if (editInvoice) {
        try {
          const invoice = JSON.parse(editInvoice) as InvoiceData & { _id: string };
          setInvoiceData(invoice);
          setIsEditMode(true);
          sessionStorage.removeItem("editInvoice");
        } catch (error) {
          console.error("[v0] Failed to parse edit invoice:", error);
        }
      } else if (duplicateInvoice) {
        try {
          const copy = JSON.parse(duplicateInvoice) as Omit<InvoiceData, "invoiceNumber">;
          fetch("/api/invoice-number")
            .then((response) => response.json())
            .then(({ invoiceNumber }) => setInvoiceData({ ...copy, invoiceNumber: typeof invoiceNumber === "number" ? invoiceNumber : 2100 }));
          setIsEditMode(false);
          sessionStorage.removeItem("duplicateInvoice");
        } catch (error) {
          console.error("[v0] Failed to parse duplicate invoice:", error);
        }
      }
    }
  }, [mounted]);

  return (
    <PasscodeGate>
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <img
            src="/incorz-logo.svg"
            alt="Incorz"
            className="h-8 w-auto object-contain flex-shrink-0"
          />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground hidden sm:block">
            Invoice Generator
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/history"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </a>
            <span
              className="text-[10px] font-bold text-white px-3 py-1 rounded-full tabular-nums flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }}
            >
              #{invoiceData.invoiceNumber}
            </span>
          </div>
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
            onSave={handleSave}
            onSendInvoice={handleSendInvoice}
            invoiceNumLoading={invoiceNumLoading}
            isEditMode={isEditMode}
            onCreateNew={handleCreateNew}
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

      {emailStatus !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="email-status-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-border">
            {emailStatus === "sending" ? (
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-red-100 border-t-[#e8000d]" aria-label="Sending email" />
            ) : (
              <div className={`mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white ${emailStatus === "success" ? "bg-emerald-500" : "bg-[#e8000d]"}`}>
                {emailStatus === "success" ? "✓" : "!"}
              </div>
            )}
            <h2 id="email-status-title" className="text-base font-semibold text-foreground">
              {emailStatus === "sending" ? "Sending invoice" : emailStatus === "success" ? "Email sent" : "Email not sent"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{emailStatusMessage}</p>
            {emailStatus !== "sending" && (
              <button
                type="button"
                onClick={() => setEmailStatus("idle")}
                className="mt-5 h-10 w-full cursor-pointer rounded-full bg-[#e8000d] text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {emailStatus === "success" ? "Done" : "Close"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Invoice Modal */}
      <SaveInvoiceModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        onSave={handleSaveWithDetails}
        isSaving={isSaving}
      />
    </div>
    </PasscodeGate>
  );
}
