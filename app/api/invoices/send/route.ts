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

const getFirstName = (value: unknown) => {
  const firstLine = String(value ?? "")
    .replace(/\r/g, "")
    .split("\n")[0]
    .replace(/^(bill\s*to|client|customer)\s*[:*-]?\s*/i, "")
    .trim();
  const name = firstLine.split(/[\s,]+/).filter(Boolean)[0];
  return name || "there";
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as InvoiceData & { pdfBase64?: string; customerName?: string };
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

    const customerName = typeof body.customerName === "string" ? body.customerName : invoice.billTo;
    const firstName = getFirstName(customerName);
    if (!pdfBase64 || !/^[A-Za-z0-9+/]+=*$/.test(pdfBase64)) {
      return NextResponse.json({ error: "Invoice PDF is required." }, { status: 400 });
    }

    await transporter.sendMail({
      from: `Buzz Filing <${process.env.SMTP_FROM}>`,
      to: recipient,
      replyTo: process.env.SMTP_USER,
      subject: `Your Buzz Filing Invoice #${invoice.invoiceNumber}`,
      text: `Hello ${firstName},\n\nThank you for choosing Buzz Filing.\n\nPlease find your invoice attached to this email for your records.\n\nIf you have any questions or need any assistance, please feel free to reply to this email.\n\nBest regards,\nBuzz Filing\nhello@buzzfiling.com\nbuzzfiling.com`,
      html: `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#222"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #eeeeee;border-radius:8px"><tr><td align="center" style="padding:40px 40px 30px"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png" alt="Buzz Filing" width="180" style="display:block;width:180px;height:auto" /></td></tr><tr><td style="padding:0 40px 40px"><p style="margin:0 0 20px;font-size:16px;color:#000">Hello ${escapeHtml(firstName)},</p><p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6">Thank you for choosing Buzz Filing.</p><p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6">Please find your invoice attached to this email for your records.</p><p style="margin:0 0 20px;font-size:14px;color:#333;line-height:1.6">If you have any questions or need any assistance, please feel free to reply to this email.</p><p style="margin:0;font-size:14px;color:#333;line-height:1.6">Best regards,<br/><strong>Buzz Filing</strong><br/><a href="mailto:hello@buzzfiling.com" style="color:#880000">hello@buzzfiling.com</a><br/><a href="https://buzzfiling.com" style="color:#880000">buzzfiling.com</a></p></td></tr><tr><td align="center" style="padding:0 40px 40px;border-top:1px solid #eeeeee"><p style="margin:30px 0 0;font-size:12px;color:#999">All rights reserved © 2026 | <span style="color:#880000;font-weight:600">Buzz Filing</span></p><p style="margin:8px 0 0;font-size:12px;color:#999">...</p></td></tr></table></td></tr></table></body></html>`,
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
