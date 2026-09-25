import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { CURRENCY_SYMBOLS } from "@/lib/invoice-types";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 40) notFound();
  const invoice = await (await getDb()).collection("invoices").findOne(
    { publicToken: token },
    { projection: { _id: 0, publicToken: 0, publicTokenCreatedAt: 0 } },
  );
  if (!invoice) notFound();
  const subtotal = invoice.lineItems.reduce((sum: number, item: { qty: number; rate: number }) => sum + item.qty * item.rate, 0);
  const total = subtotal - invoice.discount;
  const symbol = CURRENCY_SYMBOLS[invoice.currency as keyof typeof CURRENCY_SYMBOLS] || invoice.currency;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#0d0f1a] sm:px-6">
      <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
        <header className="border-b-4 border-[#e8000d] px-6 py-8 sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#e8000d]">Buzz Filing</p>
          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row">
            <div><h1 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h1><p className="mt-1 text-sm text-[#667085]">Issued {invoice.invoiceDate}</p></div>
            <span className="h-fit rounded-full bg-[#fff4cc] px-3 py-1 text-sm font-semibold text-[#b45309]">{invoice.paymentStatus}</span>
          </div>
        </header>
        <section className="grid gap-6 border-b border-[#e5e7eb] px-6 py-7 sm:grid-cols-2 sm:px-10">
          <div><p className="text-xs uppercase tracking-wide text-[#667085]">Bill to</p><p className="mt-1 font-semibold">{invoice.billTo}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-[#667085]">Service</p><p className="mt-1 font-semibold">{invoice.serviceType}</p></div>
        </section>
        <section className="overflow-x-auto px-6 py-7 sm:px-10"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="border-b border-[#e5e7eb] text-[#667085]"><th className="pb-3">Description</th><th className="pb-3 text-right">Qty</th><th className="pb-3 text-right">Rate</th><th className="pb-3 text-right">Amount</th></tr></thead><tbody>{invoice.lineItems.map((item: { description: string; qty: number; rate: number }, index: number) => <tr key={index} className="border-b border-[#f1f5f9]"><td className="py-4">{item.description}</td><td className="py-4 text-right">{item.qty}</td><td className="py-4 text-right">{symbol}{item.rate.toFixed(2)}</td><td className="py-4 text-right font-semibold">{symbol}{(item.qty * item.rate).toFixed(2)}</td></tr>)}</tbody></table></section>
        <section className="flex justify-end border-t border-[#e5e7eb] px-6 py-7 sm:px-10"><div className="w-full max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span className="text-[#667085]">Subtotal</span><span>{symbol}{subtotal.toFixed(2)}</span></div><div className="flex justify-between"><span className="text-[#667085]">Discount</span><span>-{symbol}{invoice.discount.toFixed(2)}</span></div><div className="flex justify-between border-t-2 border-[#e8000d] pt-3 text-lg font-bold"><span>Total</span><span>{symbol}{total.toFixed(2)}</span></div></div></section>
        {invoice.paymentTerms && <p className="border-t border-[#e5e7eb] px-6 py-5 text-sm text-[#667085] sm:px-10">Payment terms: {invoice.paymentTerms}</p>}
      </article>
    </main>
  );
}
