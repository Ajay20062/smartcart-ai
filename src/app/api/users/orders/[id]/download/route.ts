import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { getUserSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { createProductPdf } from "@/lib/pdf";

type CustomerOrder = RowDataPacket & {
  product_title: string;
  product_content: string;
  status: "draft" | "pending_payment" | "paid" | "fulfilled" | "failed";
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    }

    const [rows] = await pool.execute<CustomerOrder[]>(
      `SELECT product_title, product_content, status
       FROM orders
       WHERE id = ? AND LOWER(customer_email) = ?
       LIMIT 1`,
      [id, session.email],
    );
    const order = rows[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
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
       WHERE id = ? AND LOWER(customer_email) = ? AND status = 'paid'`,
      [id, session.email],
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
    console.error("Customer order delivery failed:", error);
    return NextResponse.json(
      { error: "Could not deliver the product." },
      { status: 500 },
    );
  }
}
