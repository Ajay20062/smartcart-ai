import { NextResponse } from "next/server";
import {
  getOrderByPayPalId,
  markOrderPaid,
} from "@/lib/orders";
import { capturePayPalOrder } from "@/lib/paypal";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function amountToCents(value: unknown) {
  if (typeof value !== "string" || !/^\d+\.\d{2}$/.test(value)) {
    return null;
  }
  const [whole, fraction] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const paypalOrderId =
    isRecord(body) && typeof body.paypalOrderId === "string"
      ? body.paypalOrderId
      : "";

  if (!paypalOrderId || paypalOrderId.length > 80) {
    return NextResponse.json(
      { error: "Invalid PayPal order." },
      { status: 400 },
    );
  }

  try {
    const order = await getOrderByPayPalId(paypalOrderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.status === "paid" || order.status === "fulfilled") {
      return NextResponse.json({ paid: true });
    }

    if (order.status !== "pending_payment") {
      return NextResponse.json(
        { error: "Order is not payable." },
        { status: 409 },
      );
    }

    const capture = await capturePayPalOrder(paypalOrderId, order.id);
    const purchaseUnit = capture.purchase_units?.[0];
    const payment = purchaseUnit?.payments?.captures?.[0];
    const referenceId = purchaseUnit?.custom_id ?? purchaseUnit?.reference_id;
    const paymentAmount = isRecord(payment?.amount) ? payment.amount : null;

    const paymentVerified =
      capture.status === "COMPLETED" &&
      payment?.status === "COMPLETED" &&
      referenceId === order.id &&
      paymentAmount?.currency_code === order.currency &&
      amountToCents(paymentAmount.value) === order.price_cents &&
      typeof payment?.id === "string" &&
      payment.id.length > 0;

    if (!paymentVerified || !payment?.id) {
      return NextResponse.json(
        { error: "Payment could not be verified." },
        { status: 402 },
      );
    }

    await markOrderPaid(order.id, paypalOrderId, payment.id);
    return NextResponse.json({ paid: true });
  } catch (error) {
    console.error("Payment capture failed:", error);
    return NextResponse.json(
      {
        error:
          "Payment verification failed. Please contact support if you were charged.",
      },
      { status: 500 },
    );
  }
}
