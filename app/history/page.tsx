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
import { Trash2, Edit2, Copy, ArrowLeft, Search, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [activityInvoice, setActivityInvoice] = useState<StoredInvoice | null>(null);

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
      const { _id, invoiceNumber, activity, createdAt, updatedAt, ...copy } = invoice;
      sessionStorage.setItem("duplicateInvoice", JSON.stringify(copy));
      router.push("/");
    }
  };

  const handleActivityOpen = async (invoice: StoredInvoice) => {
    setActivityInvoice(invoice);
    try {
      await fetch("/api/invoices/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice._id }),
      });
    } catch (error) {
      console.error("[v0] Failed to record opened activity:", error);
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

                        <button
                          type="button"
                          onClick={() => handleActivityOpen(invoice)}
                          className="flex w-full items-center gap-2 border-t border-border pt-2 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Activity history</span>
                          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px]">
                            {invoice.activity?.length || 0}
                          </span>
                        </button>

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

      <Dialog open={!!activityInvoice} onOpenChange={(open) => !open && setActivityInvoice(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 sm:px-6">
            <DialogTitle>
              Invoice #{activityInvoice?.invoiceNumber} activity
            </DialogTitle>
            <DialogDescription className="truncate">
              {activityInvoice?.billTo || "Invoice activity timeline"}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[calc(85vh-125px)] overflow-y-auto px-5 py-5 sm:px-6">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Events</p>
                <p className="mt-1 text-lg font-semibold">{activityInvoice?.activity?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 truncate text-sm font-semibold">{activityInvoice?.paymentStatus || "—"}</p>
              </div>
              <div className="col-span-2 rounded-lg border border-border p-3 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Last activity</p>
                <p className="mt-1 text-sm font-semibold">
                  {activityInvoice?.activity?.length
                    ? new Date(activityInvoice.activity[activityInvoice.activity.length - 1].at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
            <div className="relative space-y-4 pl-1">
              {(activityInvoice?.activity || []).slice().reverse().map((event, index) => (
                <div key={`${event.type}-${event.at}-${index}`} className="relative flex gap-3">
                  <div className="relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#e8000d] ring-4 ring-white" />
                  <div className="min-w-0 flex-1 border-b border-border pb-4 last:border-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium capitalize">{event.type}</p>
                      <time dateTime={event.at} className="text-xs text-muted-foreground">
                        {new Date(event.at).toLocaleString()}
                      </time>
                    </div>
                  </div>
                </div>
              ))}
              {!activityInvoice?.activity?.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </div>
          </div>
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
