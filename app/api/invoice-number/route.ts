import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

// DB document: { "_id": "invoice_number", "value": 1 }
// value: 1  → invoice 2100, value: 2 → invoice 2101, etc.
const DOC_ID      = "invoice_number";
const COLLECTION  = "settings";
const OFFSET      = 2099; // value + OFFSET = invoice number

// GET — returns the current invoice number without incrementing
export async function GET() {
  try {
    const db  = await getDb();
    const doc = await db
      .collection(COLLECTION)
      .findOne({ _id: DOC_ID as unknown as import("mongodb").ObjectId });

    const invoiceNumber = doc ? (doc.value as number) + OFFSET : 2100;
    return NextResponse.json({ invoiceNumber });
  } catch (err) {
    console.error("[invoice-number GET]", err);
    return NextResponse.json({ error: "Failed to fetch invoice number" }, { status: 500 });
  }
}

// POST — increments value by 1, returns the NEW invoice number
export async function POST() {
  try {
    const db     = await getDb();
    const result = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: DOC_ID as unknown as import("mongodb").ObjectId },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    const invoiceNumber = result ? (result.value as number) + OFFSET : 2101;
    return NextResponse.json({ invoiceNumber });
  } catch (err) {
    console.error("[invoice-number POST]", err);
    return NextResponse.json({ error: "Failed to increment invoice number" }, { status: 500 });
  }
}
