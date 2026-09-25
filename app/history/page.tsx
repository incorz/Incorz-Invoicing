"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Trash2, Edit2, Copy, ArrowLeft, Search, Share2, Download } from "lucide-react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StoredInvoice extends InvoiceData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<{ invoice: StoredInvoice; url: string; qr: string } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

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
        // Remove from local state immediately for instant UI update
        setInvoices((prev) => prev.filter((inv) => inv._id !== id));
        setDeleteId(null);
        
        // Refetch to ensure server state is in sync
        setTimeout(() => {
          fetchInvoices();
        }, 500);
      } else {
        alert("Failed to delete invoice");
      }
    } catch (error) {
      console.error("[v0] Failed to delete invoice:", error);
      alert("Error deleting invoice");
    }
  };

  const handleEdit = (invoice: StoredInvoice) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("editInvoice", JSON.stringify(invoice));
      router.push("/");
    }
  };

  const handleDuplicate = (invoice: StoredInvoice) => {
    if (typeof window !== "undefined") {
      const { _id, invoiceNumber, createdAt, updatedAt, ...copy } = invoice;
      sessionStorage.setItem("duplicateInvoice", JSON.stringify(copy));
      router.push("/");
    }
  };

  const handleCreateShare = async (invoice: StoredInvoice) => {
    setSharingId(invoice._id);
    try {
      const response = await fetch("/api/invoices/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice._id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to create link");
      const url = `${window.location.origin}/invoice/${result.token}`;
      const qr = await QRCode.toDataURL(url, { width: 360, margin: 1, color: { dark: "#0d0f1a", light: "#ffffff" } });
      setShareState({ invoice, url, qr });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to create secure link");
    } finally {
      setSharingId(null);
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
          <div className="flex-1" />
          <Link href="/">
            <Button size="sm" className="cursor-pointer" style={{ background: "#e8000d" }}>
              Create New Invoice
            </Button>
          </Link>
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
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by invoice number, client, or team member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Invoices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoices
                .filter((invoice) => {
                  const query = searchQuery.toLowerCase();
                  return (
                    invoice.invoiceNumber.toString().includes(query) ||
                    invoice.billTo.toLowerCase().includes(query) ||
                    invoice.teamMember?.toLowerCase().includes(query) ||
                    invoice.invoiceDescription?.toLowerCase().includes(query)
                  );
                })
                .map((invoice) => {
                  const subtotal = invoice.lineItems.reduce(
                    (sum, item) => sum + item.qty * item.rate,
                    0
                  );
                  const total = subtotal - invoice.discount;

                  return (
                    <div
                      key={invoice._id}
                      className="border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                    >
                      {/* Card Header */}
                      <div className="p-4 border-b border-border">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm">
                              Invoice #{invoice.invoiceNumber}
                            </h3>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                            invoice.paymentStatus === "Paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {invoice.paymentStatus}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="text-sm font-medium truncate">{invoice.billTo}</p>
                        </div>

                        {invoice.teamMember && (
                          <div>
                            <p className="text-xs text-muted-foreground">Team Member</p>
                            <p className="text-sm font-medium">{invoice.teamMember}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold">
                              {CURRENCY_SYMBOLS[invoice.currency]}
                              {total.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Items</p>
                            <p className="text-lg font-semibold">
                              {invoice.lineItems.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer - Actions */}
                      <div className="px-4 py-3 bg-gray-50 border-t border-border flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(invoice)}
                            className="flex-1 gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(invoice)}
                            className="gap-2 cursor-pointer"
                            title="Duplicate invoice"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateShare(invoice)}
                            disabled={sharingId === invoice._id}
                            className="gap-2 cursor-pointer"
                            title="Create secure public link"
                          >
                            {sharingId === invoice._id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e8000d] border-t-transparent" /> : <Share2 className="w-4 h-4" />}
                            <span className="sr-only">Share invoice</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                          onClick={() => setDeleteId(invoice._id)}
                          className="flex-1 gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {invoices.filter((invoice) => {
              const query = searchQuery.toLowerCase();
              return (
                invoice.invoiceNumber.toString().includes(query) ||
                invoice.billTo.toLowerCase().includes(query) ||
                invoice.teamMember?.toLowerCase().includes(query) ||
                invoice.invoiceDescription?.toLowerCase().includes(query)
              );
            }).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No invoices match your search</p>
              </div>
            )}
          </div>
        )}
      </main>

      <Dialog open={!!shareState} onOpenChange={(open) => !open && setShareState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Secure invoice link</DialogTitle>
            <DialogDescription>Share this private link or QR code with {shareState?.invoice.billTo}.</DialogDescription>
          </DialogHeader>
          {shareState && <div className="space-y-5">
            <div className="flex justify-center rounded-xl border border-[#e5e7eb] bg-white p-4"><img src={shareState.qr} alt="QR code for secure invoice link" className="h-52 w-52" /></div>
            <div className="flex gap-2"><input readOnly value={shareState.url} className="min-w-0 flex-1 rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs" /><Button type="button" onClick={() => navigator.clipboard.writeText(shareState.url)} className="shrink-0 bg-[#e8000d] hover:bg-[#b00009]">Copy</Button></div>
            <a href={shareState.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg border border-[#e8000d] px-4 py-2 text-sm font-semibold text-[#e8000d]"><Download className="h-4 w-4" /> Open public invoice</a>
            <p className="text-center text-xs text-[#667085]">Anyone with this unguessable link can view this invoice. Create a new link to revoke the previous one.</p>
          </div>}
        </DialogContent>
      </Dialog>

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
