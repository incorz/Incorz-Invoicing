import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import type { InvoiceData } from "@/lib/invoice-types";
import { consumeRateLimit, ensureRateLimitIndexes, getClientIdentifier } from "@/lib/security";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_LENGTH = 500;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sanitizeText = (value: unknown, maxLength = MAX_TEXT_LENGTH) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maxLength) : "";

const sanitizeFilename = (value: unknown) =>
  sanitizeText(value, 80).replace(/[^a-zA-Z0-9._-]/g, "-") || "invoice";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getFirstName = (value: unknown) => {
  const firstLine = String(value ?? "")
    .replace(/\r/g, "")
    .split("\n")[0]
    .replace(/^(bill\s*to|client|customer)\s*[:*-]?\s*/i, "")
    .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "")
    .trim();
  const name = firstLine.split(/[\s,]+/).filter(Boolean)[0];
  return name || "there";
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }

    const body = (await request.json()) as InvoiceData & { _id?: string; pdfBase64?: string; customerName?: string };
    const { pdfBase64, ...invoice } = body;
    const recipient = sanitizeText(invoice.clientEmail, 254).toLowerCase();

    if (!recipient || !emailPattern.test(recipient)) {
      return NextResponse.json({ error: "A valid client email is required." }, { status: 400 });
    }

    const [recipientLimit, ipLimit] = await Promise.all([
      consumeRateLimit(request, "invoice-email-recipient", recipient, 5, 60 * 60 * 1000),
      consumeRateLimit(request, "invoice-email-ip", getClientIdentifier(request), 20, 60 * 60 * 1000),
    ]);
    if (!recipientLimit.allowed || !ipLimit.allowed) {
      const retryAfter = Math.max(recipientLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
      return NextResponse.json(
        { error: "Too many invoice emails. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    await ensureRateLimitIndexes();

    const requiredEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"] as const;
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
      return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });

    const customerName = sanitizeText(body.customerName || invoice.billTo);
    const firstName = getFirstName(customerName);
    const currentYear = new Date().getFullYear();
    if (!pdfBase64 || typeof pdfBase64 !== "string" || !/^[A-Za-z0-9+/]+=*$/.test(pdfBase64) || Buffer.byteLength(pdfBase64, "base64") > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "Invoice PDF is required and must be smaller than 8 MB." }, { status: 400 });
    }
    const invoiceNumber = sanitizeFilename(invoice.invoiceNumber);

    await transporter.sendMail({
      from: `Incorz <${process.env.SMTP_FROM}>`,
      to: recipient,
      replyTo: process.env.SMTP_USER,
      subject: `Your Incorz Invoice #${invoiceNumber}`,
      text: `Hello ${firstName},\n\nThank you for choosing Incorz.\n\nPlease find your invoice attached to this email for your records.\n\nIf you have any questions or need any assistance, please feel free to reply to this email.`,
      html: `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#222"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #eeeeee;border-radius:8px"><tr><td align="center" style="padding:40px 40px 30px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:10px;vertical-align:middle"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/favicon.ico-zJBGJKNsWVvjClhCoJivJT9WYCUeWW.png" alt="Incorz" width="40" height="40" style="display:block;width:40px;height:40px" /></td><td style="vertical-align:middle;font-size:30px;font-weight:700;color:#111827;letter-spacing:-0.5px">incorz</td></tr></table></td></tr><tr><td style="padding:0 40px 40px"><p style="margin:0 0 20px;font-size:16px;color:#000">Hello ${escapeHtml(firstName)},</p><p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6">Thank you for choosing Incorz.</p><p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6">Please find your invoice attached to this email for your records.</p><p style="margin:0;font-size:14px;color:#333;line-height:1.6">If you have any questions or need any assistance, please feel free to reply to this email.</p></td></tr><tr><td align="center" style="padding:0 40px 40px;border-top:1px solid #eeeeee"><p style="margin:30px 0 0;font-size:12px;color:#999">© ${currentYear} Incorz</p></td></tr></table></td></tr></table></body></html>`,
      attachments: [
        {
          filename: `Invoice-${invoiceNumber}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Failed to send invoice email:", error);
    return NextResponse.json({ error: "Unable to send invoice email." }, { status: 500 });
  }
}
