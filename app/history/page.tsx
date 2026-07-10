"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InvoiceData, CURRENCY_SYMBOLS } from "@/lib/invoice-types";
import Link from "next/link";
import { Trash2, Edit2, ArrowLeft } from "lucide-react";

interface StoredInvoice extends InvoiceData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export default function HistoryPage() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices/list");
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error("[v0] Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/invoices/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        setDeleteId(null);
      }
    } catch (error) {
      console.error("[v0] Failed to delete invoice:", error);
    }
  };

  const handleEdit = (invoice: StoredInvoice) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("editInvoice", JSON.stringify(invoice));
      window.location.href = "/";
    }
  };

  const calculateTotal = (invoice: StoredInvoice) => {
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
    return subtotal - invoice.discount + invoice.paymentReceived;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Invoice History</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No invoices yet</p>
            <Link href="/">
              <Button>Create New Invoice</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => {
              const subtotal = invoice.lineItems.reduce(
                (sum, item) => sum + item.qty * item.rate,
                0
              );
              const total = subtotal - invoice.discount;

              return (
                <div
                  key={invoice._id}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm">
                          Invoice #{invoice.invoiceNumber}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                          {invoice.paymentStatus}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {invoice.billTo}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {CURRENCY_SYMBOLS[invoice.currency]}
                        {total.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.lineItems.length} item
                        {invoice.lineItems.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(invoice)}
                      className="gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(invoice._id)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
