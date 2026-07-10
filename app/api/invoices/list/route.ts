import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";
// Don't cache list to ensure deleted invoices are immediately removed
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const invoices = db.collection("invoices");

    const docs = await invoices
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Convert ObjectId to string for JSON serialization
    const invoiceList = docs.map((doc: any) => ({
      ...doc,
      _id: doc._id.toString(),
    }));

    return Response.json(
      { invoices: invoiceList },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[v0] Invoice list error:", error);
    return Response.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
