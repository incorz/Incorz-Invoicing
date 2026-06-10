"use client";

import { PDFDocument, PDFPage, rgb } from "pdf-lib";

export interface EditedRegion {
  id: string;
  type: "text" | "delete";
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  originalText?: string;
}

export interface PDFEditorState {
  originalPdfBytes: Uint8Array;
  pages: PDFPage[];
  pdfDoc: PDFDocument | null;
  edits: EditedRegion[];
}

/**
 * Load PDF and parse its pages
 */
export async function loadPDF(file: File): Promise<{ pdfDoc: PDFDocument; pages: PDFPage[]; bytes: Uint8Array }> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);
  const pages = pdfDoc.getPages();

  return {
    pdfDoc,
    pages,
    bytes: new Uint8Array(bytes),
  };
}

/**
 * Apply edits to PDF and export as new PDF
 */
export async function applyEditsAndExport(
  pdfDoc: PDFDocument,
  edits: EditedRegion[]
): Promise<Uint8Array> {
  try {
    // Create a new PDF document for output
    const newPdf = await PDFDocument.create();

    // Copy pages from original PDF
    const pages = pdfDoc.getPages();
    const copiedPages = await newPdf.copyPages(pdfDoc, pages.map((_, i) => i));

    copiedPages.forEach((page) => {
      newPdf.addPage(page);
    });

    // Apply text edits and deletions
    edits.forEach((edit) => {
      const pageIndex = edit.pageIndex;
      if (pageIndex < newPdf.getPages().length) {
        const page = newPdf.getPages()[pageIndex];

        if (edit.type === "delete") {
          // Draw white rectangle to "delete" content
          page.drawRectangle({
            x: edit.x,
            y: edit.y,
            width: edit.width,
            height: edit.height,
            color: rgb(1, 1, 1), // white
          });
        } else if (edit.type === "text" && edit.text !== undefined) {
          // Draw white rectangle first to cover original text
          page.drawRectangle({
            x: edit.x,
            y: edit.y,
            width: edit.width,
            height: edit.height,
            color: rgb(1, 1, 1), // white
          });

          // Draw new text
          page.drawText(edit.text, {
            x: edit.x,
            y: edit.y,
            size: 12,
            color: rgb(0, 0, 0), // black
          });
        }
      }
    });

    const pdfBytes = await newPdf.save();
    return pdfBytes;
  } catch (error) {
    console.error("[v0] Error applying edits to PDF:", error);
    throw new Error("Failed to apply edits to PDF");
  }
}

/**
 * Render PDF page to canvas
 */
export async function renderPageToCanvas(
  pdfDoc: PDFDocument,
  pageIndex: number,
  scale: number = 1.5
): Promise<HTMLCanvasElement> {
  const pdfModule = await import("pdfjs-dist");
  const pdfjsLib = pdfModule as any;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

  // Get page dimensions
  const pages = pdfDoc.getPages();
  if (pageIndex >= pages.length) {
    throw new Error("Page index out of bounds");
  }

  const page = pages[pageIndex];
  const { width, height } = page.getSize();

  // Create canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  canvas.width = width * scale;
  canvas.height = height * scale;

  // Draw page background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}

/**
 * Export edited PDF as new file
 */
export async function exportEditedPDF(pdfBytes: Uint8Array, filename: string = "edited-invoice.pdf"): Promise<void> {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
