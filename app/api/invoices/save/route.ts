import { getDb } from "@/lib/mongodb";
import { InvoiceData } from "@/lib/invoice-types";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json() as InvoiceData & { _id?: string };
    const db = await getDb();
    const invoices = db.collection("invoices");

    if (body._id) {
      // Update existing invoice - exclude _id from the update
      const { _id, ...updateData } = body;
      const result = await invoices.updateOne(
        { _id: new ObjectId(_id) },
        {
          $set: {
            ...updateData,
            updatedAt: new Date(),
          },
        }
      );
      
      if (result.matchedCount === 0) {
        return Response.json(
          { error: "Invoice not found" },
          { status: 404 }
        );
      }
      
      return Response.json({ success: true, _id });
    } else {
      // Create new invoice
      const result = await invoices.insertOne({
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return Response.json({ success: true, _id: result.insertedId });
    }
  } catch (error) {
    console.error("[v0] Invoice save error:", error);
    return Response.json(
      { error: "Failed to save invoice" },
      { status: 500 }
    );
  }
}
