import { NextResponse } from "next/server";
import {
  getOrderByPayPalId,
  markOrderPaid,
} from "@/lib/orders";
import { verifyPayPalWebhook } from "@/lib/paypal";

const requiredHeaders = [
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
] as const;

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
  let event: unknown;

  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const paypalHeaders: Record<string, string> = {};
  for (const name of requiredHeaders) {
    const value = request.headers.get(name);
    if (!value) {
      return NextResponse.json(
        { error: "Missing webhook headers." },
        { status: 400 },
      );
    }
    paypalHeaders[name] = value;
  }

  try {
    const verification = await verifyPayPalWebhook(paypalHeaders, event);

    if (verification.verification_status !== "SUCCESS") {
      return NextResponse.json(
        { error: "Invalid webhook signature." },
        { status: 400 },
      );
    }

    if (
      !isRecord(event) ||
      event.event_type !== "PAYMENT.CAPTURE.COMPLETED"
    ) {
      return NextResponse.json({ received: true });
    }

    const capture = event.resource;
    if (!isRecord(capture)) {
      return NextResponse.json(
        { error: "Invalid capture event." },
        { status: 400 },
      );
    }

    const supplementaryData = isRecord(capture.supplementary_data)
      ? capture.supplementary_data
      : null;
    const relatedIds =
      supplementaryData && isRecord(supplementaryData.related_ids)
        ? supplementaryData.related_ids
        : null;
    const paypalOrderId =
      relatedIds && typeof relatedIds.order_id === "string"
        ? relatedIds.order_id
        : "";
    const captureId = typeof capture.id === "string" ? capture.id : "";
    const captureAmount = isRecord(capture.amount) ? capture.amount : null;

    if (!paypalOrderId || !captureId || !captureAmount) {
      return NextResponse.json(
        { error: "Invalid capture details." },
        { status: 400 },
      );
    }

    const order = await getOrderByPayPalId(paypalOrderId);
    if (!order) {
      console.warn("Verified PayPal webhook for unknown order:", paypalOrderId);
      return NextResponse.json({ received: true });
    }

    const amountMatches =
      capture.status === "COMPLETED" &&
      captureAmount.currency_code === order.currency &&
      amountToCents(captureAmount.value) === order.price_cents;

    if (!amountMatches) {
      console.error("Verified webhook payment amount mismatch:", {
        paypalOrderId,
        captureId,
      });
      return NextResponse.json({ received: true });
    }

    await markOrderPaid(order.id, paypalOrderId, captureId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
