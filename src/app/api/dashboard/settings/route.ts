import { NextResponse } from "next/server";
import { getCreatorSession } from "@/lib/auth";
import { pool } from "@/lib/db";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PUT(request: Request) {
  const session = await getCreatorSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const creatorName =
    isRecord(body) && typeof body.creatorName === "string"
      ? body.creatorName.trim()
      : "";
  const creatorEmail =
    isRecord(body) && typeof body.creatorEmail === "string"
      ? body.creatorEmail.trim()
      : "";
  const brandDescription =
    isRecord(body) && typeof body.brandDescription === "string"
      ? body.brandDescription.trim()
      : "";
  const basePriceCents =
    isRecord(body) && typeof body.basePriceCents === "number"
      ? body.basePriceCents
      : Number.NaN;

  if (creatorName.length < 2 || creatorName.length > 160) {
    return NextResponse.json(
      { error: "Store name must be between 2 and 160 characters." },
      { status: 400 },
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creatorEmail) ||
    creatorEmail.length > 254
  ) {
    return NextResponse.json(
      { error: "Enter a valid creator email." },
      { status: 400 },
    );
  }

  if (
    !Number.isInteger(basePriceCents) ||
    basePriceCents < 100 ||
    basePriceCents > 100_000
  ) {
    return NextResponse.json(
      { error: "Base price must be between $1.00 and $1,000.00." },
      { status: 400 },
    );
  }

  if (brandDescription.length > 500) {
    return NextResponse.json(
      { error: "Brand description must be 500 characters or fewer." },
      { status: 400 },
    );
  }

  try {
    await pool.execute(
      `INSERT INTO creator_settings
        (id, creator_name, creator_email, currency, base_price_cents,
         brand_description)
       VALUES (1, ?, ?, 'USD', ?, ?)
       ON DUPLICATE KEY UPDATE
         creator_name = VALUES(creator_name),
         creator_email = VALUES(creator_email),
         base_price_cents = VALUES(base_price_cents),
         brand_description = VALUES(brand_description)`,
      [creatorName, creatorEmail, basePriceCents, brandDescription],
    );

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Settings update failed:", error);
    return NextResponse.json(
      { error: "Could not save creator settings." },
      { status: 500 },
    );
  }
}
