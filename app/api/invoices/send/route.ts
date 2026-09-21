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
    if (!pdfBase64 || !/^[A-Za-z0-9+/]+=*$/.test(pdfBase64)) {
      return NextResponse.json({ error: "Invoice PDF is required." }, { status: 400 });
    }

    await transporter.sendMail({
      from: `Buzz Filing <${process.env.SMTP_FROM}>`,
      to: recipient,
      replyTo: process.env.SMTP_USER,
      subject: `Your Buzz Filing Invoice #${invoice.invoiceNumber}`,
      text: `Hello ${firstName},\n\nThank you for choosing Buzz Filing.\n\nPlease find your invoice attached to this email for your records.\n\nIf you have any questions or need any assistance, please feel free to reply to this email.\n\nBest regards,\nBuzz Filing\nhello@buzzfiling.com\nbuzzfiling.com`,
      html: `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#202020"><div style="max-width:560px;margin:24px auto;background:#fff;border-top:5px solid #e8000d;padding:34px 28px 24px"><div style="text-align:center;margin-bottom:30px"><img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/images-SdNz6vfYoJoMVJMUFtXCjHac5xozpZ.png" alt="Buzz Filing" width="150" style="display:inline-block;max-width:150px;height:auto" /></div><p style="font-size:14px">Hello ${escapeHtml(firstName)},</p><p style="font-size:13px;line-height:1.7">Thank you for choosing <strong>Buzz Filing</strong>.</p><p style="font-size:13px;line-height:1.7">Please find your invoice attached to this email for your records.</p><p style="font-size:13px;line-height:1.7">If you have any questions or need any assistance, please feel free to reply to this email.</p><p style="font-size:13px;line-height:1.7;margin-top:26px">Best regards,<br/><strong>Buzz Filing</strong><br/><a href="mailto:hello@buzzfiling.com" style="color:#e8000d">hello@buzzfiling.com</a><br/><a href="https://buzzfiling.com" style="color:#e8000d">buzzfiling.com</a></p><p style="text-align:center;color:#999;font-size:11px;margin:30px 0 0">© 2026 Buzz Filing</p></div></body></html>`,
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
