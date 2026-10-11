import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { createProductPdf } from "@/lib/pdf";

type DeliverableOrder = RowDataPacket & {
  product_title: string;
  product_content: string;
  status: "draft" | "pending_payment" | "paid" | "fulfilled" | "failed";
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { error: "Invalid delivery link." },
        { status: 400 },
      );
    }

    const [rows] = await pool.execute<DeliverableOrder[]>(
      `SELECT product_title, product_content, status
       FROM orders WHERE delivery_token = ? LIMIT 1`,
      [token],
    );
    const order = rows[0];

    if (!order) {
      return NextResponse.json(
        { error: "Delivery link not found." },
        { status: 404 },
      );
    }

    if (order.status !== "paid" && order.status !== "fulfilled") {
      return NextResponse.json(
        { error: "Payment has not been confirmed." },
        { status: 403 },
      );
    }

    const pdf = await createProductPdf(
      order.product_title,
      order.product_content,
    );

    await pool.execute(
      `UPDATE orders
       SET status = 'fulfilled', delivered_at = COALESCE(delivered_at, NOW())
       WHERE delivery_token = ? AND status = 'paid'`,
      [token],
    );

    const safeName =
      order.product_title.replace(/[^a-z0-9-_ ]/gi, "").trim().slice(0, 60) ||
      "smartcart-product";

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF delivery failed:", error);
    return NextResponse.json(
      { error: "Could not deliver the product." },
      { status: 500 },
    );
  }
}
