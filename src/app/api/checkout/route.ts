import { NextResponse } from "next/server";
import { attachPayPalOrder, getOrderById } from "@/lib/orders";
import { createPayPalCheckout } from "@/lib/paypal";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const orderId =
    isRecord(body) && typeof body.orderId === "string" ? body.orderId : "";

  if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }

  try {
    const order = await getOrderById(orderId);

    if (!order || order.status !== "draft") {
      return NextResponse.json(
        { error: "This order cannot be checked out." },
        { status: 409 },
      );
    }

    const paypalOrder = await createPayPalCheckout({
      priceCents: order.price_cents,
      currency: order.currency,
      title: order.product_title,
      localOrderId: order.id,
    });

    const approvalUrl = paypalOrder.links?.find(
      (link) => link.rel === "approve",
    )?.href;

    if (!paypalOrder.id || !approvalUrl) {
      throw new Error("PayPal did not return an approval link.");
    }

    const approval = new URL(approvalUrl);
    if (
      approval.protocol !== "https:" ||
      !["www.sandbox.paypal.com", "www.paypal.com"].includes(
        approval.hostname,
      )
    ) {
      throw new Error("PayPal returned an invalid approval URL.");
    }

    await attachPayPalOrder(order.id, paypalOrder.id);

    return NextResponse.json({ approvalUrl: approval.toString() });
  } catch (error) {
    console.error("Checkout creation failed:", error);
    return NextResponse.json(
      { error: "Could not start PayPal checkout." },
      { status: 500 },
    );
  }
}
