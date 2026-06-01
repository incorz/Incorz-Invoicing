"use client";

import type * as pdfjs from "pdfjs-dist";
import type Tesseract from "tesseract.js";

export interface ExtractedInvoiceData {
  text: string;
  confidence: number;
}

/**
 * Extract text from an image file using OCR
 */
export async function extractTextFromImage(
  file: File
): Promise<ExtractedInvoiceData> {
  try {
    const Tesseract = (await import("tesseract.js")).default;
    const result = await Tesseract.recognize(file, "eng");
    const text = result.data.text;
    const confidence = result.data.confidence;

    return {
      text,
      confidence,
    };
  } catch (error) {
    console.error("[v0] OCR extraction failed:", error);
    throw new Error("Failed to extract text from image. Please try again.");
  }
}

/**
 * Extract text from a PDF file
 */
export async function extractTextFromPDF(
  file: File
): Promise<ExtractedInvoiceData> {
  try {
    const pdfModule = await import("pdfjs-dist");
    const pdfjsLib = pdfModule as any;
    
    // Set worker path for pdfjs - use CDN version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";
    const pageCount = Math.min(pdf.numPages, 3); // Limit to first 3 pages

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n";
    }

    // If no text was extracted, return a generic message
    if (!fullText.trim()) {
      fullText = "PDF processed but contains scanned images or no extractable text. Please try with a text-based PDF or image file.";
    }

    return {
      text: fullText,
      confidence: 100,
    };
  } catch (error) {
    console.error("[v0] PDF extraction failed:", error);
    throw new Error("Failed to extract text from PDF. The file may be corrupted, scanned, or use unsupported encoding. Please try with a different file or use an image format.");
  }
}

/**
 * Extract invoice data from text using regex patterns
 */
export function parseInvoiceFromText(text: string) {
  // Extract amount (looks for currency symbols followed by numbers)
  const amountMatch = text.match(/[\$£€]?\s*(\d+[.,]\d{2}|\d+)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;

  // Extract date patterns
  const datePatterns = [
    /(?:date|dated|invoice date)[\s:]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
  ];

  let invoiceDate = new Date().toISOString().split("T")[0];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      invoiceDate = match[1];
      break;
    }
  }

  // Extract invoice number
  const invoiceNumberMatch = text.match(
    /(?:invoice|inv|#)[\s:]*([A-Z0-9\-]{3,})/i
  );
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : "";

  // Extract "Bill To" / recipient name
  const billToMatch = text.match(
    /(?:bill to|invoice to|customer|client)[\s:]*\n?([^\n]+)/i
  );
  const billTo = billToMatch ? billToMatch[1].trim() : "";

  // Extract description/service
  const descriptionMatch = text.match(
    /(?:description|service|item)[\s:]*\n?([^\n]+)/i
  );
  const description = descriptionMatch ? descriptionMatch[1].trim() : "";

  return {
    billTo,
    invoiceDate,
    invoiceNumber: invoiceNumber ? parseInt(invoiceNumber.replace(/\D/g, "")) || 0 : 0,
    description,
    amount,
  };
}
