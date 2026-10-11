import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { pool } from "@/lib/db";

type UserOrder = RowDataPacket & {
  id: string;
  product_title: string;
  price_cents: number;
  currency: string;
  status: "draft" | "pending_payment" | "paid" | "fulfilled" | "failed";
  created_at: Date;
};

export async function GET() {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const [metricRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(status IN ('paid', 'fulfilled')) AS paid_orders,
         COALESCE(SUM(
           CASE WHEN status IN ('paid', 'fulfilled')
                THEN price_cents ELSE 0 END
         ), 0) AS revenue_cents
       FROM orders
       WHERE LOWER(customer_email) = ?`,
      [session.email],
    );

    const [orderRows] = await pool.execute<UserOrder[]>(
      `SELECT id, product_title, price_cents, currency, status, created_at
       FROM orders
       WHERE LOWER(customer_email) = ?
       ORDER BY created_at DESC
       LIMIT 25`,
      [session.email],
    );

    const stats = metricRows[0] ?? {};

    return NextResponse.json(
      {
        user: { email: session.email },
        metrics: {
          totalOrders: Number(stats.total_orders ?? 0),
          paidOrders: Number(stats.paid_orders ?? 0),
          revenueCents: Number(stats.revenue_cents ?? 0),
        },
        orders: orderRows,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("User dashboard fetch failed:", error);
    return NextResponse.json(
      { error: "Could not load your dashboard." },
      { status: 500 },
    );
  }
}
