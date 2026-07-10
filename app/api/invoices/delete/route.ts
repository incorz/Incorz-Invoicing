import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id || body._id;
    
    if (!id) {
      return Response.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const invoices = db.collection("invoices");

    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return Response.json(
        { error: "Invalid invoice ID format" },
        { status: 400 }
      );
    }

    const result = await invoices.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return Response.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Revalidate cache to ensure deleted invoice is removed from list
    revalidatePath("/api/invoices/list");
    revalidatePath("/history");

    return Response.json({ success: true });
  } catch (error) {
    console.error("[v0] Invoice delete error:", error);
    return Response.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
