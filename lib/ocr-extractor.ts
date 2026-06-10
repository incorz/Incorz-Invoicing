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
    // Dynamically import pdfjs
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjs = pdfjsModule as any;
    
    // Set worker from node_modules
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = "";
    const pageCount = Math.min(pdf.numPages, 5); // Limit to first 5 pages

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => {
            if (typeof item.str === "string") {
              return item.str;
            }
            return "";
          })
          .join(" ")
          .trim();
        
        if (pageText) {
          fullText += pageText + "\n";
        }
      } catch (pageError) {
        console.warn(`[v0] Failed to extract text from page ${pageNum}:`, pageError);
        // Continue with next page
        continue;
      }
    }

    // If no text was extracted, provide helpful feedback
    if (!fullText.trim()) {
      fullText = "[Scanned PDF or no extractable text detected]";
    }

    return {
      text: fullText,
      confidence: fullText.includes("[Scanned") ? 50 : 100,
    };
  } catch (error) {
    console.error("[v0] PDF extraction error:", error);
    // Provide a more specific error message
    let errorMessage = "Failed to extract text from PDF.";
    if (error instanceof Error) {
      if (error.message.includes("worker")) {
        errorMessage += " The PDF worker failed to load. Please try again.";
      } else if (error.message.includes("corrupt") || error.message.includes("damaged")) {
        errorMessage += " The file appears to be corrupted.";
      } else {
        errorMessage += " The file may be in an unsupported format.";
      }
    }
    throw new Error(errorMessage);
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
