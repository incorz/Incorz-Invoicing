"use client";

import { Dispatch, SetStateAction } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceData, LineItem, PaymentStatus, Currency, CURRENCY_NAMES, CURRENCY_SYMBOLS } from "@/lib/invoice-types";

interface InvoiceFormProps {
  data: InvoiceData;
  setData: Dispatch<SetStateAction<InvoiceData>>;
  onDownload: () => void;
  onReset: () => void;
  onSave: () => void;
  invoiceNumLoading?: boolean;
  isEditMode?: boolean;
  onCreateNew?: () => void;
}

export default function InvoiceForm({
  data,
  setData,
  onDownload,
  onReset,
  onSave,
  invoiceNumLoading = false,
  isEditMode = false,
  onCreateNew,
}: InvoiceFormProps) {
  const updateField = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const addLineItem = () => {
    setData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: crypto.randomUUID(), description: "", qty: 1, rate: 0 },
      ],
    }));
  };

  const removeLineItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const subTotal = data.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const balance = subTotal - data.discount - data.paymentReceived;

  return (
    <div className="flex flex-col divide-y divide-border">

      {/* ── Title ── */}
      <div className="px-5 py-5 flex items-center gap-3">
        <span className="w-0.5 h-5 rounded-full" style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }} />
        <div>
          <h2 className="text-sm font-bold" style={{ color: "#0d0f1a" }}>Invoice Details</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "#6b7280" }}>Preview updates live as you type</p>
        </div>
      </div>

      {/* ── Client Info ── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Client</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="billTo" className="text-xs">Bill To *</Label>
          <Input
            id="billTo"
            placeholder="Client full name"
            value={data.billTo}
            onChange={(e) => updateField("billTo", e.target.value)}
            className="field-input h-9"
          />
        </div>
      </div>

      {/* ── Invoice Meta ── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Invoice</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Number</Label>
            <div className="h-9 flex items-center px-4 rounded-full border border-border bg-muted/60 text-xs font-semibold tabular-nums text-foreground">
              {invoiceNumLoading ? (
                <span className="text-muted-foreground animate-pulse">Loading…</span>
              ) : (
                `#${data.invoiceNumber}`
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoiceDate" className="text-xs">Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={data.invoiceDate}
              onChange={(e) => updateField("invoiceDate", e.target.value)}
              className="field-input h-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceType" className="text-xs">Services Type</Label>
          <Input
            id="serviceType"
            placeholder="e.g. LLC Formation + ITIN"
            value={data.serviceType}
            onChange={(e) => updateField("serviceType", e.target.value)}
            className="field-input h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoiceBy" className="text-xs">Invoice By</Label>
          <Input
            id="invoiceBy"
            placeholder="Team member name"
            value={data.invoiceBy}
            onChange={(e) => updateField("invoiceBy", e.target.value)}
            className="field-input h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Payment Status</Label>
          <Select
            value={data.paymentStatus}
            onValueChange={(v) => updateField("paymentStatus", v as PaymentStatus)}
          >
            <SelectTrigger className="field-input h-9 px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial Paid">Partial Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Currency</Label>
          <Select
            value={data.currency}
            onValueChange={(v) => updateField("currency", v as Currency)}
          >
            <SelectTrigger className="field-input h-9 px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Line Items ── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Services</p>

        <div className="flex flex-col gap-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_48px_72px_32px] gap-1.5 text-[10px] font-medium text-muted-foreground px-1">
            <span>Description</span>
            <span className="text-center">QTY</span>
            <span className="text-center">Rate {CURRENCY_SYMBOLS[data.currency]}</span>
            <span />
          </div>

          {data.lineItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_48px_72px_32px] gap-1.5 items-center">
                <Input
                  placeholder="Service description"
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                  className="field-input h-8 text-xs"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.qty === 0 ? "" : item.qty}
                  placeholder="1"
                  onChange={(e) => updateLineItem(item.id, "qty", parseFloat(e.target.value) || 0)}
                  className="field-input h-8 text-xs text-center px-1"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={item.rate === 0 ? "" : item.rate}
                  placeholder="0.00"
                  onChange={(e) => updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                  className="field-input h-8 text-xs text-center px-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer rounded-full"
                  onClick={() => removeLineItem(item.id)}
                  disabled={data.lineItems.length === 1}
                  aria-label="Remove line item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              {/* Amount display */}
              <div className="text-right pr-9 text-[10px] font-semibold text-muted-foreground">
                = {CURRENCY_SYMBOLS[data.currency]}{(item.qty * item.rate).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 rounded-full cursor-pointer text-xs h-8 border-dashed"
          onClick={addLineItem}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add Service
        </Button>
      </div>

      {/* ── Pricing ── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Pricing</p>

        <div className="grid grid-cols-2 gap-3">
          {/* Sub Total (read-only) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Sub Total</Label>
            <div className="h-9 flex items-center px-4 rounded-full border border-border bg-muted/60 text-xs font-semibold text-foreground tabular-nums">
              {CURRENCY_SYMBOLS[data.currency]}{subTotal.toFixed(2)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discount" className="text-xs">Discount ({CURRENCY_SYMBOLS[data.currency]})</Label>
            <Input
              id="discount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={data.discount === 0 ? "" : data.discount}
              onChange={(e) => updateField("discount", parseFloat(e.target.value) || 0)}
              className="field-input h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentReceived" className="text-xs">Payment Received ({CURRENCY_SYMBOLS[data.currency]})</Label>
            <Input
              id="paymentReceived"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={data.paymentReceived === 0 ? "" : data.paymentReceived}
              onChange={(e) => updateField("paymentReceived", parseFloat(e.target.value) || 0)}
              className="field-input h-9"
            />
          </div>

          {/* Balance (read-only) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold" style={{ color: "#ff0d13" }}>Balance</Label>
            <div
              className="h-9 flex items-center px-4 rounded-full text-xs font-bold text-white tabular-nums"
              style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }}
            >
              {CURRENCY_SYMBOLS[data.currency]}{balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Terms ── */}
      <div className="px-5 py-5 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Payment Terms</p>
        <Textarea
          placeholder="e.g. An advance payment of $225 has been received. The remaining balance will be due once the EIN is issued."
          value={data.paymentTerms}
          onChange={(e) => updateField("paymentTerms", e.target.value)}
          rows={3}
          className="field-input resize-none text-xs rounded-2xl px-4 py-3"
        />
      </div>

      {/* ── Actions ── */}
      <div className="px-5 py-5 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Export</p>

        <Button
          className="w-full h-10 text-white font-semibold rounded-full cursor-pointer text-xs tracking-wider border-0 transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ff0d13 0%, #ff6b00 100%)" }}
          onClick={onDownload}
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          className="w-full h-9 rounded-full cursor-pointer text-xs text-muted-foreground border-border hover:bg-secondary"
          onClick={onSave}
        >
          Save Invoice
        </Button>
        <Button
          variant="outline"
          className="w-full h-9 rounded-full cursor-pointer text-xs text-muted-foreground border-border hover:bg-secondary"
          onClick={onReset}
        >
          Reset Form
        </Button>
        {isEditMode && onCreateNew && (
          <Button
            className="w-full h-9 rounded-full cursor-pointer text-xs font-semibold text-white border-0 transition-opacity hover:opacity-90"
            style={{ background: "#e8000d" }}
            onClick={onCreateNew}
          >
            Create New Invoice
          </Button>
        )}
      </div>

    </div>
  );
}
