"use client";

import { forwardRef, CSSProperties } from "react";
import { InvoiceData, COMPANY_INFO, CURRENCY_SYMBOLS } from "@/lib/invoice-types";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  red:      "#e8000d",
  black:    "#000000",
  darkBg:   "#000000",
  darkBorder:"#000000",
  border:   "#e8e8e8",
  rowAlt:   "#fcfcfc",
  muted:    "#000000",
  subtle:   "#000000",
  dimText:  "#000000",
  grayText: "#000000",
  lightGray:"#e8e8e8",
  headerBg: "#e8e8e8",
  white:    "#ffffff",
} as const;

const BRAND = "#ff0d13";

const FONT = "'Unbounded', Arial, sans-serif";

const PAGE_W  = 794;   // A4 @ 96 dpi
const PAGE_H  = 1123;
const PAD     = 40;



// ─── Shared style helpers ─────────────────────────────────────────────────────
const cell = (overrides: CSSProperties = {}): CSSProperties => ({
  padding: "8px 12px",
  borderBottom: `1px solid ${C.border}`,
  color: C.black,
  ...overrides,
});

const thStyle = (overrides: CSSProperties = {}): CSSProperties => ({
  padding: "8px 12px",
  fontWeight: "700",
  fontSize: "8px",
  letterSpacing: "0.6px",
  textTransform: "uppercase",
  color: C.black,
  ...overrides,
});

const labelStyle: CSSProperties = {
  fontSize: "7.5px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
  color: C.black,
  marginBottom: "6px",
};

// ─── Component ────────────────────────────────────────────────────────────────
interface InvoicePreviewProps {
  data: InvoiceData;
}

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(({ data }, ref) => {
  // ── Derived values
  const subTotal = data.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const balance  = subTotal - data.discount - data.paymentReceived;

  const formattedDate = data.invoiceDate
    ? new Date(data.invoiceDate + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "";

  const statusBg = BRAND;

  const metaRows: [string, string, boolean][] = [
    ["INVOICE NUMBER", String(data.invoiceNumber), false],
    ["INVOICE DATE",   formattedDate || "—",        false],
    ["SERVICES TYPE",  data.serviceType || "—",      false],
    ["INVOICE BY",     data.invoiceBy   || "—",      false],
  ];

  const totalsRows: [string, string][] = [
    ["Sub Total", `${CURRENCY_SYMBOLS[data.currency]}${subTotal.toFixed(2)}`],
    ["Discount",  `${CURRENCY_SYMBOLS[data.currency]}${data.discount.toFixed(2)}`],
    ["Payment",   `${CURRENCY_SYMBOLS[data.currency]}${data.paymentReceived.toFixed(2)}`],
  ];

  const bankRows: [string, string][] = [
    ["Account Title",   COMPANY_INFO.bankAccountTitle],
    ["Account Number",  COMPANY_INFO.bankAccountNumber],
    ["IBAN",            COMPANY_INFO.iban],
    ["Bank Name",       COMPANY_INFO.bankName],
  ];

  // ── Root page
  return (
    <div
      ref={ref}
      id="invoice-preview"
      style={{
        fontFamily: FONT,
        background: C.white,
        color: C.black,
        width:     `${PAGE_W}px`,
        minHeight: `${PAGE_H}px`,
        margin: "0 auto",
        fontSize: "10px",
        lineHeight: "1.5",
        display: "flex",
        flexDirection: "column",
      }}
    >

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{ padding: `32px ${PAD}px 0`, textAlign: "center" }}>

        {/* Logo — 150px, no bottom gap */}
        <div style={{ marginBottom: "0px" }}>
          <img
            src="/incorz-logo.svg"
            alt="Incorz"
            crossOrigin="anonymous"
            style={{ height: "60px", width: "auto", objectFit: "contain", display: "inline-block" }}
          />
        </div>

        {/* Address block */}
        <p style={{ fontSize: "9.5px", color: C.black, margin: "0 0 3px", letterSpacing: "0.1px" }}>
          {COMPANY_INFO.address}
        </p>
        <p style={{ fontSize: "9.5px", color: C.black, margin: "0 0 3px" }}>
          {COMPANY_INFO.website}
          <span style={{ margin: "0 5px", color: C.black }}>•</span>
          {COMPANY_INFO.email}
          <span style={{ margin: "0 5px", color: C.black }}>•</span>
          {COMPANY_INFO.filingEmail}
        </p>
        <p style={{ fontSize: "9.5px", color: C.black, margin: "0 0 20px" }}>
          {COMPANY_INFO.phones.map((p, i) => (
            <span key={p}>
              {i > 0 && <span style={{ margin: "0 5px", color: C.black }}>•</span>}
              {p}
            </span>
          ))}
        </p>

      </header>

      {/* ── TITLE ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: `22px ${PAD}px 14px` }}>
        <span style={{ fontSize: "28px", fontWeight: "900", lineHeight: 1, color: BRAND }}>Hi!</span>
        <span style={{ fontSize: "28px", fontWeight: "900",                       color: C.black, lineHeight: 1 }}>{" "}This is Your Invoice.</span>
      </div>

      {/* ── META ROW ──────────────────────────────────────────────────────── */}
      <div style={{ padding: `14px ${PAD}px`, overflow: "hidden" }}>

        {/* Payment Status — floated right so it renders independently in html2canvas */}
        <div style={{ float: "right", width: "180px", marginLeft: "12px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{
                  background: statusBg,
                  color: C.white,
                  fontWeight: "700",
                  fontSize: "13px",
                  letterSpacing: "0.3px",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "16px 8px",
                  height: "48px",
                }}>
                  Payment Status
                </td>
              </tr>
              <tr>
                <td style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderTop: "none",
                  fontWeight: "700",
                  fontSize: "14px",
                  color: C.black,
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "16px 8px",
                  height: "48px",
                }}>
                  {data.paymentStatus}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bill To + Invoice fields — flows left of the float */}
        <table style={{
          borderCollapse: "collapse",
          tableLayout: "fixed",
          width: `${PAGE_W - PAD * 2 - 200}px`,
        }}>
          <colgroup>
            <col style={{ width: "200px" }} />
            <col />
          </colgroup>
          <tbody>
            <tr>
              {/* ── Bill To ── */}
              <td style={{ verticalAlign: "top", paddingRight: "16px" }}>
                <div style={{
                  fontSize: "7.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  color: C.black,
                  marginBottom: "4px",
                }}>
                  BILL TO
                </div>
                <div style={{
                  fontSize: "9.5px",
                  fontWeight: "600",
                  color: C.black,
                  lineHeight: 1.5,
                }}>
                  {data.billTo || "—"}
                </div>
              </td>

              {/* ── Invoice fields ── */}
              <td style={{ verticalAlign: "top" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "100px" }} />
                    <col />
                  </colgroup>
                  <tbody>
                    {metaRows.map(([label, value, bold]) => (
                      <tr key={label}>
                        <td style={{
                          fontSize: "7.5px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                          color: C.black,
                          padding: "4px 16px 4px 0",
                          whiteSpace: "nowrap",
                          verticalAlign: "middle",
                        }}>
                          {label}
                        </td>
                        <td style={{
                          fontSize: "9.5px",
                          fontWeight: bold ? "700" : "400",
                          color: C.black,
                          padding: "4px 0",
                          verticalAlign: "middle",
                        }}>
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* ── LINE ITEMS + TOTALS (unified table) ──────────────────────────── */}
      <div style={{ padding: `36px ${PAD}px 0` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0, fontSize: "9.5px" }}>

          {/* Column widths */}
          <colgroup>
            <col style={{ width: "auto" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "60px"  }} />
            <col style={{ width: "90px"  }} />
            <col style={{ width: "100px" }} />
          </colgroup>

          {/* Header */}
          <thead>
            <tr style={{ background: "transparent" }}>
              <th style={thStyle({ textAlign: "left",   padding: "9px 12px" })}>DESCRIPTION</th>
              <th style={thStyle({ padding: "9px 12px" })} />
              <th style={thStyle({ textAlign: "center", padding: "9px 12px" })}>QTY</th>
              <th style={thStyle({ textAlign: "right",  padding: "9px 12px" })}>RATE</th>
              <th style={thStyle({ textAlign: "right",  padding: "9px 12px" })}>AMOUNT</th>
            </tr>
          </thead>

          <tbody>
            {/* Line item rows */}
            {data.lineItems.map((item, idx) => {
              const amount = item.qty * item.rate;
              return (
                <tr key={item.id} style={{ background: C.white }}>
                  <td style={cell({ fontWeight: "500", padding: "9px 12px" })}>
                    {item.description || "—"}
                  </td>
                  <td style={cell({ color: C.black, fontSize: "8.5px", padding: "9px 12px" })}>
                    {item.rate === 0 ? "INCLUDED" : ""}
                  </td>
                  <td style={cell({ textAlign: "center", padding: "9px 12px" })}>{item.qty}</td>
                  <td style={cell({ textAlign: "right",  padding: "9px 12px" })}>
                    {item.rate === 0 ? "—" : `${CURRENCY_SYMBOLS[data.currency]}${item.rate.toFixed(0)}`}
                  </td>
                  <td style={cell({ textAlign: "right", fontWeight: "700", padding: "9px 12px" })}>
                    {item.rate === 0 ? "—" : `${CURRENCY_SYMBOLS[data.currency]}${amount.toFixed(0)}`}
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>

        {/* Totals block — table for reliable html2canvas rendering */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <colgroup>
            <col />
            <col style={{ width: "90px" }} />
            <col style={{ width: "100px" }} />
          </colgroup>
          <tbody>
            {totalsRows.map(([label, value]) => (
              <tr key={label}>
                <td style={{ background: BRAND, padding: "5px 12px" }} />
                <td style={{
                  background: BRAND,
                  padding: "5px 12px",
                  fontSize: "9px",
                  color: C.white,
                  fontWeight: "400",
                  textAlign: "left",
                  verticalAlign: "middle",
                }}>{label}</td>
                <td style={{
                  background: BRAND,
                  padding: "5px 12px",
                  fontSize: "9.5px",
                  color: C.white,
                  fontWeight: "700",
                  textAlign: "right",
                  verticalAlign: "middle",
                }}>{value}</td>
              </tr>
            ))}
            {/* Balance row */}
            <tr>
              <td style={{ background: BRAND, padding: "10px 12px" }} />
              <td style={{
                background: BRAND,
                padding: "10px 12px",
                fontSize: "15px",
                fontWeight: "900",
                color: C.white,
                textAlign: "left",
                verticalAlign: "middle",
              }}>Balance</td>
              <td style={{
                background: BRAND,
                padding: "10px 12px",
                fontSize: "14px",
                fontWeight: "900",
                color: C.white,
                textAlign: "right",
                verticalAlign: "middle",
              }}>{CURRENCY_SYMBOLS[data.currency]}{balance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── THANK YOU ─────────────────────────────────────────────────────── */}
      <div style={{ padding: `32px ${PAD}px 28px`, textAlign: "center" }}>
        <span style={{ fontSize: "18px", fontWeight: "900", color: C.black }}>Thank you for your </span>
        <span style={{ fontSize: "18px", fontWeight: "900", color: BRAND }}>business!</span>
      </div>

      {/* ── PAYMENT TERMS ─────────────────────────────────────────────────── */}
      <div style={{ padding: `0 ${PAD}px 20px` }}>
        <div style={labelStyle}>PAYMENT TERMS</div>
        <div style={{ fontSize: "9px", color: C.black, lineHeight: "1.8" }}>
          {data.paymentTerms || "—"}
        </div>
      </div>

      {/* ── PKR BANK ──────────────────────────────────────────────────────── */}
      <div style={{ padding: `0 ${PAD}px 16px` }}>
        <div style={labelStyle}>PKR BANK</div>
        <div>
          {bankRows.map(([label, value]) => (
            <div key={label} style={{ fontSize: "9px", color: C.black, lineHeight: "1.6", marginBottom: "3px" }}>
              {label}: {value}
            </div>
          ))}
        </div>
      </div>

      {/* ── USD BANK ──────────────────────────────────────────────────────── */}
      <div style={{ padding: `0 ${PAD}px 16px` }}>
        <div style={labelStyle}>USD BANK</div>
        <div>
          {[
            ["Account Title",    "INCORZ LLC"],
            ["Type of Account",  "Checking"],
            ["Account Number",   "660270560183679"],
            ["Routing Number",   "121145433"],
            ["Bank Name",        "Column N.A."],
            ["Recipient Address","1209 Mountain Road Place Northeast, STE R Albuquerque, NM 87110"],
          ].map(([label, value]) => (
            <div key={label} style={{ fontSize: "9px", color: C.black, lineHeight: "1.6", marginBottom: "3px" }}>
              {label}: {value}
            </div>
          ))}
        </div>
      </div>

      {/* ── PAYONEER ──────────────────────────────────────────────────────── */}
      <div style={{ padding: `0 ${PAD}px 24px` }}>
        <div style={labelStyle}>PAYONEER</div>
        <div style={{ fontSize: "9px", color: C.black, lineHeight: "1.6" }}>
          incorz.official@gmail.com
        </div>
      </div>

      {/* ── FLEX SPACER ───────────���───────����───────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── PRE-FOOTER ROW ────────────────────────────────────────────────── */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        borderTop: `1px dashed ${C.border}`,
        marginTop: "8px",
      }}>
        <tbody>
          <tr>
            <td style={{ padding: `10px ${PAD}px`, fontSize: "8px", color: C.black, letterSpacing: "0.2px", verticalAlign: "middle" }}>
              E. &amp; O. E
            </td>
            <td style={{ padding: `10px ${PAD}px`, fontSize: "8px", fontWeight: "500", color: BRAND, textAlign: "right", verticalAlign: "middle" }}>
              NOTE : Please email us the payment receipt.
            </td>
          </tr>
        </tbody>
      </table>

    </div>
  );
});

InvoicePreview.displayName = "InvoicePreview";
export default InvoicePreview;
