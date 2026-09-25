import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token || token.length < 40) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoice = await (await getDb()).collection("invoices").findOne(
      { publicToken: token },
      { projection: { _id: 0, publicToken: 0, publicTokenCreatedAt: 0 } },
    );

    if (!invoice) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    return Response.json(invoice, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[v0] Failed to fetch public invoice:", error);
    return Response.json({ error: "Unable to load invoice" }, { status: 500 });
  }
}
