import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { calculatePrice } from "@/lib/pricing";
import { generateProduct } from "@/lib/product";
import { createOrder } from "@/lib/orders";
import {
  getProductFormatLabel,
  isProductFormat,
} from "@/lib/product-options";

type CreatorSettings = RowDataPacket & {
  creator_name: string;
  creator_email: string;
  brand_description: string;
  currency: string;
  base_price_cents: number;
};

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

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const customerRequest =
    typeof body.request === "string" ? body.request.trim() : "";
  const format = body.format === undefined ? "guide" : body.format;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (customerRequest.length < 10 || customerRequest.length > 2000) {
    return NextResponse.json(
      { error: "Your request must be between 10 and 2000 characters." },
      { status: 400 },
    );
  }
  if (!isProductFormat(format)) {
    return NextResponse.json(
      { error: "Choose a supported product format." },
      { status: 400 },
    );
  }

  try {
    const [settingsRows] = await pool.execute<CreatorSettings[]>(
      `SELECT creator_name, creator_email, brand_description,
              currency, base_price_cents
       FROM creator_settings ORDER BY id LIMIT 1`,
    );
    const settings = settingsRows[0];

    if (!settings) {
      throw new Error("Creator settings are missing; run database/schema.sql.");
    }
    if (settings.currency !== "USD") {
      throw new Error("Only USD pricing is currently supported.");
    }

    const formatLabel = getProductFormatLabel(format);
    const orderRequest = `Format: ${formatLabel}\n\n${customerRequest}`;
    const product = await generateProduct(customerRequest, format);
    const priceCents = calculatePrice(
      orderRequest,
      product.content,
      Number(settings.base_price_cents),
    );

    if (
      !product.title.trim() ||
      !product.content.trim() ||
      !Number.isInteger(priceCents) ||
      priceCents < 100 ||
      priceCents > 100_000
    ) {
      throw new Error("Generated product or price is invalid.");
    }

    const order = await createOrder({
      email,
      request: orderRequest,
      title: product.title,
      content: product.content,
      priceCents,
      currency: settings.currency,
    });

    return NextResponse.json({
      orderId: order.id,
      deliveryToken: order.deliveryToken,
      title: product.title,
      preview: product.content.slice(0, 500),
      priceCents,
      currency: settings.currency,
      creatorName: settings.creator_name,
      brandDescription: settings.brand_description,
    });
  } catch (error) {
    console.error("Product creation failed:", error);
    return NextResponse.json(
      { error: "Could not create your product. Please try again." },
      { status: 500 },
    );
  }
}
