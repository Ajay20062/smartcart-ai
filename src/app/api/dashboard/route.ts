import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import type { OrderStatus } from "@/lib/orders";

type CreatorSettings = RowDataPacket & {
  creator_name: string;
  creator_email: string;
  base_price_cents: number;
  brand_description: string;
};

type DashboardMetrics = RowDataPacket & {
  total_orders: number | string;
  paid_orders: number | string | null;
  revenue_cents: number | string | null;
};

type DashboardOrder = RowDataPacket & {
  id: string;
  customer_email: string | null;
  product_title: string;
  price_cents: number;
  currency: string;
  status: OrderStatus;
  created_at: Date;
};

export async function GET() {
  const session = await getCreatorSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const [settingsRows] = await pool.execute<CreatorSettings[]>(
      `SELECT creator_name, creator_email, base_price_cents,
              brand_description
       FROM creator_settings
       WHERE id = 1 LIMIT 1`,
    );
    const [metricRows] = await pool.execute<DashboardMetrics[]>(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(status IN ('paid', 'fulfilled')) AS paid_orders,
         COALESCE(SUM(
           CASE WHEN status IN ('paid', 'fulfilled')
                THEN price_cents ELSE 0 END
         ), 0) AS revenue_cents
       FROM orders`,
    );
    const [orderRows] = await pool.execute<DashboardOrder[]>(
      `SELECT id, customer_email, product_title, price_cents,
              currency, status, created_at
       FROM orders
       ORDER BY created_at DESC
       LIMIT 50`,
    );

    const metrics = metricRows[0];
    return NextResponse.json(
      {
        settings: settingsRows[0] ?? null,
        metrics: {
          totalOrders: Number(metrics?.total_orders ?? 0),
          paidOrders: Number(metrics?.paid_orders ?? 0),
          revenueCents: Number(metrics?.revenue_cents ?? 0),
        },
        orders: orderRows,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Dashboard fetch failed:", error);
    return NextResponse.json(
      { error: "Could not load dashboard data." },
      { status: 500 },
    );
  }
}
