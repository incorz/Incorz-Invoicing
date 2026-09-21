import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import type { InvoiceData } from "@/lib/invoice-types";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getFirstName = (billTo: string) => {
  const name = billTo.trim().replace(/[,].*$/, "").split(/\s+/)[0];
  return name || "there";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InvoiceData & { pdfBase64?: string };
    const { pdfBase64, ...invoice } = body;
    const recipient = invoice.clientEmail?.trim();

    if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json({ error: "A valid client email is required." }, { status: 400 });
    }

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

    const firstName = getFirstName(invoice.billTo);
    const symbol = invoice.currency === "GBP" ? "£" : "$";
    const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);
    const total = subtotal - invoice.discount;
    const itemRows = invoice.lineItems
      .filter((item) => item.description.trim())
      .map(
        (item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eeeeee">${escapeHtml(item.description)}</td><td style="padding:10px 0;border-bottom:1px solid #eeeeee;text-align:right">${item.qty} × ${symbol}${item.rate.toFixed(2)}</td></tr>`,
      )
      .join("");

    if (!pdfBase64 || !/^[A-Za-z0-9+/]+=*$/.test(pdfBase64)) {
      return NextResponse.json({ error: "Invoice PDF is required." }, { status: 400 });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      replyTo: process.env.SMTP_USER,
      subject: `Invoice #${invoice.invoiceNumber} from Buzz Filing`,
      text: `Hello ${firstName},\n\nPlease find your Buzz Filing invoice #${invoice.invoiceNumber} attached.\n\nThank you,\nBuzz Filing`,
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#202020"><div style="max-width:560px;margin:24px auto;background:#fff;border-top:5px solid #e8000d;padding:34px 28px 24px"><div style="text-align:center;margin-bottom:30px"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png" alt="Buzz Filing" width="150" style="display:inline-block;max-width:150px;height:auto" /></div><p style="font-size:14px">Hello ${escapeHtml(firstName)},</p><p style="font-size:13px;line-height:1.7">Please find your invoice from <strong>Buzz Filing</strong>. Thank you for choosing us.</p><table style="width:100%;border-collapse:collapse;font-size:13px;margin:24px 0">${itemRows}<tr><td style="padding:14px 0;font-weight:bold">Total</td><td style="padding:14px 0;text-align:right;font-weight:bold;color:#e8000d">${symbol}${total.toFixed(2)}</td></tr></table><div style="background:#fff7f7;border-left:3px solid #e8000d;padding:14px;font-size:12px;line-height:1.6"><strong>Payment terms</strong><br/>${escapeHtml(invoice.paymentTerms || "Please contact us for payment details.").replaceAll("\n", "<br/>")}</div><p style="font-size:12px;line-height:1.7;margin-top:26px">If you have any questions, reply to this email or contact us at hello@buzzfiling.com.</p><p style="font-size:12px">Thank you,<br/><strong>Buzz Filing</strong></p><p style="text-align:center;color:#999;font-size:11px;margin:30px 0 0">© 2026 Buzz Filing · www.buzzfiling.com</p></div></body></html>`,
      attachments: [
        {
          filename: `Invoice-${invoice.invoiceNumber}.pdf`,
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
