"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractTextFromImage, extractTextFromPDF, parseInvoiceFromText } from "@/lib/ocr-extractor";

interface UploadInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceExtracted: (data: {
    billTo: string;
    invoiceDate: string;
    invoiceNumber: number;
    description: string;
    amount: number;
  }) => void;
}

export function UploadInvoiceDialog({
  open,
  onOpenChange,
  onInvoiceExtracted,
}: UploadInvoiceDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [extractionFailed, setExtractionFailed] = useState(false);

  const handleFileSelect = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or image file (JPEG, PNG, WebP)");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview("📄 PDF File Ready for Processing");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    setExtractionFailed(false);

    try {
      let extractedData;
      let extractionSucceeded = true;

      try {
        if (selectedFile.type === "application/pdf") {
          extractedData = await extractTextFromPDF(selectedFile);
        } else {
          extractedData = await extractTextFromImage(selectedFile);
        }

        // Check if extraction returned meaningful data
        if (!extractedData.text || extractedData.text.trim().length < 5) {
          extractionSucceeded = false;
        }
      } catch (extractError) {
        // Mark extraction as failed but allow user to proceed manually
        console.error("[v0] Extraction error:", extractError);
        extractionSucceeded = false;
      }

      // If extraction failed, show error and allow manual entry
      if (!extractionSucceeded) {
        setError(
          selectedFile.type === "application/pdf"
            ? "Could not automatically extract text from this PDF. You can still proceed and manually enter the invoice details by referencing the PDF preview above."
            : "Could not automatically extract text from this image. You can still proceed and manually enter the invoice details by referencing the image preview above."
        );
        setExtractionFailed(true);
        setLoading(false);
        return;
      }

      // Auto-fill successful - populate the form
      const parsedData = parseInvoiceFromText(extractedData.text);

      onInvoiceExtracted({
        billTo: parsedData.billTo,
        invoiceDate: parsedData.invoiceDate,
        invoiceNumber: parsedData.invoiceNumber,
        description: parsedData.description,
        amount: parsedData.amount,
      });

      // Reset and close
      setSelectedFile(null);
      setPreview("");
      onOpenChange(false);
    } catch (err) {
      console.error("[v0] Error processing file:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process file. Please try again or enter the invoice details manually."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProceedManually = () => {
    // Close the dialog and allow user to manually enter data while viewing the preview
    // If needed, we could store the preview for reference
    setSelectedFile(null);
    setPreview("");
    setError("");
    setExtractionFailed(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview("");
    setError("");
    setExtractionFailed(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Invoice</DialogTitle>
          <DialogDescription>
            Upload a PDF or image of an invoice to auto-fill the form
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-2">
                {selectedFile?.type.startsWith("image/") ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-40 mx-auto rounded"
                  />
                ) : (
                  <div className="text-4xl">{preview}</div>
                )}
                <p className="text-sm font-medium">{selectedFile?.name}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">
                    PDF or image files (JPEG, PNG, WebP)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            {extractionFailed ? (
              <Button
                onClick={handleProceedManually}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Proceed & Manually Enter
              </Button>
            ) : (
              <Button
                onClick={handleProcessFile}
                disabled={!selectedFile || loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? "Processing..." : "Extract & Import"}
              </Button>
            )}
          </div>

          {/* Clear Button */}
          {selectedFile && !loading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setPreview("");
              }}
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Clear File
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
