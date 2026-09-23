import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";
// Don't cache list to ensure deleted invoices are immediately removed
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invoice id is required" }, { status: 400 });
    }
    const db = await getDb();
    const result = await db.collection("invoices").updateOne(
      { _id: new ObjectId(id) },
      { $push: { activity: { type: "opened", at: new Date().toISOString() } } } as any,
    );
    if (!result.matchedCount) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("[v0] Invoice activity error:", error);
    return Response.json({ error: "Failed to record activity" }, { status: 500 });
  }
}

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
