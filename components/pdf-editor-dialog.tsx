"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Save, RotateCcw, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { loadPDF, applyEditsAndExport, EditedRegion, exportEditedPDF } from "@/lib/pdf-editor";
import { extractTextFromPDF, parseInvoiceFromText } from "@/lib/ocr-extractor";

interface PDFEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File | null;
  onExtractComplete: (data: {
    billTo: string;
    invoiceDate: string;
    invoiceNumber: number;
    description: string;
    amount: number;
  }) => void;
}

export function PDFEditorDialog({ open, onOpenChange, file, onExtractComplete }: PDFEditorDialogProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1.5);
  const [edits, setEdits] = useState<EditedRegion[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF
  useEffect(() => {
    if (!open || !file) return;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const { pdfDoc: doc } = await loadPDF(file);
        setPdfDoc(doc);
        setCurrentPage(0);
        setEdits([]);
      } catch (err) {
        console.error("[v0] PDF load error:", err);
        setError("Failed to load PDF. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, file]);

  // Render PDF page on canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || currentPage >= pdfDoc.getPages().length) return;

    const renderPage = async () => {
      const pdfModule = await import("pdfjs-dist");
      const pdfjsLib = pdfModule as any;

      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

      const page = pdfDoc.getPages()[currentPage];
      const { width, height } = page.getSize();

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = width * zoom;
      canvas.height = height * zoom;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw white background
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw page border
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    };

    renderPage().catch(console.error);
  }, [pdfDoc, currentPage, zoom]);

  const handleAddTextEdit = useCallback(() => {
    const id = `text-${Date.now()}`;
    const newEdit: EditedRegion = {
      id,
      type: "text",
      pageIndex: currentPage,
      x: 50,
      y: 50,
      width: 200,
      height: 20,
      text: "",
      originalText: "",
    };
    setEdits([...edits, newEdit]);
    setEditingTextId(id);
    setEditingText("");
  }, [currentPage, edits]);

  const handleAddDeleteRegion = useCallback(() => {
    const newEdit: EditedRegion = {
      id: `delete-${Date.now()}`,
      type: "delete",
      pageIndex: currentPage,
      x: 50,
      y: 100,
      width: 200,
      height: 50,
    };
    setEdits([...edits, newEdit]);
  }, [currentPage, edits]);

  const handleRemoveEdit = useCallback((id: string) => {
    setEdits(edits.filter((e) => e.id !== id));
    if (editingTextId === id) {
      setEditingTextId(null);
      setEditingText("");
    }
  }, [edits, editingTextId]);

  const handleSaveEdit = useCallback((id: string, text: string) => {
    setEdits(edits.map((e) => (e.id === id ? { ...e, text } : e)));
    setEditingTextId(null);
    setEditingText("");
  }, [edits]);

  const handleApplyAndExtract = async () => {
    if (!pdfDoc || !file) return;

    setLoading(true);
    setError("");

    try {
      // Apply edits and export PDF
      const editedPdfBytes = await applyEditsAndExport(pdfDoc, edits);

      // Create a new File object from the edited PDF
      const editedFile = new File([editedPdfBytes], "edited-invoice.pdf", { type: "application/pdf" });

      // Re-run OCR extraction on edited PDF
      const extractedData = await extractTextFromPDF(editedFile);

      if (!extractedData.text || extractedData.text.trim().length < 5) {
        setError("No text could be extracted from the edited PDF. Please try again.");
        setLoading(false);
        return;
      }

      // Parse the extracted text
      const parsedData = parseInvoiceFromText(extractedData.text);

      // Callback with extracted data
      onExtractComplete({
        billTo: parsedData.billTo,
        invoiceDate: parsedData.invoiceDate,
        invoiceNumber: parsedData.invoiceNumber,
        description: parsedData.description,
        amount: parsedData.amount,
      });

      // Close dialog
      onOpenChange(false);
    } catch (err) {
      console.error("[v0] Error applying edits:", err);
      setError("Failed to process edited PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setEdits([]);
    setEditingTextId(null);
    setEditingText("");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit PDF - Invoice</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
        ) : pdfDoc ? (
          <>
            {/* PDF Viewer */}
            <div
              ref={containerRef}
              className="flex-1 overflow-auto border border-border rounded-lg bg-muted p-4"
            >
              <div className="flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-border shadow-sm bg-white cursor-crosshair"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
              {/* Page Navigation */}
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage + 1} of {pdfDoc.getPages().length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCurrentPage(Math.min(pdfDoc.getPages().length - 1, currentPage + 1))
                    }
                    disabled={currentPage === pdfDoc.getPages().length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-16 text-center">{Math.round(zoom * 100)}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Edit Tools */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleAddTextEdit}>
                  + Add Text Edit
                </Button>
                <Button size="sm" variant="outline" onClick={handleAddDeleteRegion}>
                  + Delete Region
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReset}
                  disabled={edits.length === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              </div>

              {/* Active Edits */}
              {edits.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <div className="text-sm font-medium">Active Edits ({edits.length})</div>
                  {edits.map((edit) => (
                    <div key={edit.id} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                      {edit.type === "text" ? (
                        <>
                          <Input
                            value={editingTextId === edit.id ? editingText : edit.text || ""}
                            onChange={(e) => {
                              setEditingTextId(edit.id);
                              setEditingText(e.target.value);
                            }}
                            placeholder="Enter text..."
                            className="h-8 text-xs flex-1"
                          />
                          {editingTextId === edit.id && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(edit.id, editingText)}
                              className="h-8 px-2"
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="flex-1 text-muted-foreground">Delete region on page {edit.pageIndex + 1}</span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveEdit(edit.id)}
                        className="h-8 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyAndExtract}
                  disabled={loading || !edits.length}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Apply Edits & Extract
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
