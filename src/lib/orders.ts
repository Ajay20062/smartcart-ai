import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "failed";

export type SmartCartOrder = RowDataPacket & {
  id: string;
  customer_email: string | null;
  customer_request: string;
  product_title: string;
  product_content: string;
  price_cents: number;
  currency: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  status: OrderStatus;
  delivery_token: string | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export async function createOrder(input: {
  email: string;
  request: string;
  title: string;
  content: string;
  priceCents: number;
  currency: string;
}) {
  const id = randomUUID();
  const deliveryToken = randomBytes(32).toString("hex");

  await pool.execute<ResultSetHeader>(
    `INSERT INTO orders
      (id, customer_email, customer_request, product_title, product_content,
       price_cents, currency, status, delivery_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [
      id,
      input.email,
      input.request,
      input.title,
      input.content,
      input.priceCents,
      input.currency,
      deliveryToken,
    ],
  );

  return { id, deliveryToken };
}

export async function getOrderById(id: string) {
  const [rows] = await pool.execute<SmartCartOrder[]>(
    "SELECT * FROM orders WHERE id = ? LIMIT 1",
    [id],
  );

  return rows[0] ?? null;
}

export async function getOrderByPayPalId(paypalOrderId: string) {
  const [rows] = await pool.execute<SmartCartOrder[]>(
    "SELECT * FROM orders WHERE paypal_order_id = ? LIMIT 1",
    [paypalOrderId],
  );

  return rows[0] ?? null;
}

export async function attachPayPalOrder(
  id: string,
  paypalOrderId: string,
) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE orders
     SET paypal_order_id = ?, status = 'pending_payment'
     WHERE id = ? AND status = 'draft'`,
    [paypalOrderId, id],
  );

  if (result.affectedRows === 0) {
    const order = await getOrderById(id);
    if (
      order?.paypal_order_id === paypalOrderId &&
      order.status === "pending_payment"
    ) {
      return;
    }

    throw new Error("Order is no longer available for checkout.");
  }
}

export async function markOrderPaid(
  id: string,
  paypalOrderId: string,
  captureId: string,
) {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE orders
     SET paypal_capture_id = COALESCE(paypal_capture_id, ?),
         status = CASE
           WHEN status = 'fulfilled' THEN 'fulfilled'
           ELSE 'paid'
         END
     WHERE id = ?
       AND paypal_order_id = ?
       AND status IN ('pending_payment', 'paid', 'fulfilled')
       AND (paypal_capture_id IS NULL OR paypal_capture_id = ?)`,
    [captureId, id, paypalOrderId, captureId],
  );

  if (result.affectedRows === 0) {
    const order = await getOrderById(id);
    if (
      order?.paypal_order_id === paypalOrderId &&
      order.paypal_capture_id === captureId &&
      (order.status === "paid" || order.status === "fulfilled")
    ) {
      return;
    }

    throw new Error("Payment does not match a payable order.");
  }
}
