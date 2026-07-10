import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: string };
    const db = await getDb();
    const invoices = db.collection("invoices");

    const result = await invoices.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return Response.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("[v0] Invoice delete error:", error);
    return Response.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
