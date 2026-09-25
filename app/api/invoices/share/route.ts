import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { invoiceId } = await request.json();
    if (typeof invoiceId !== "string" || !ObjectId.isValid(invoiceId)) {
      return Response.json({ error: "A valid invoice is required" }, { status: 400 });
    }

    const db = await getDb();
    const token = randomBytes(32).toString("base64url");
    const result = await db.collection("invoices").updateOne(
      { _id: new ObjectId(invoiceId) },
      { $set: { publicToken: token, publicTokenCreatedAt: new Date() } },
    );

    if (!result.matchedCount) {
      return Response.json({ error: "Invoice not found" }, { status: 404 });
    }

    return Response.json({ token });
  } catch (error) {
    console.error("[v0] Failed to create invoice share link:", error);
    return Response.json({ error: "Unable to create secure share link" }, { status: 500 });
  }
}
