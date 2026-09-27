import { notFound } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import InvoicePreview from "@/components/invoice-preview";
import { InvoiceData } from "@/lib/invoice-types";

export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 40) notFound();
  const invoice = await (await getDb()).collection("invoices").findOne(
    { publicToken: token },
    { projection: { _id: 0, publicToken: 0, publicTokenCreatedAt: 0 } },
  );
  if (!invoice) notFound();
  return (
    <main className="min-h-screen overflow-x-auto bg-[#f8fafc] px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-fit min-w-full">
        <InvoicePreview data={invoice as unknown as InvoiceData} />
      </div>
    </main>
  );
}
