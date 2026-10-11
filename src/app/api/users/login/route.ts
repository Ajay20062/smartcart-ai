import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { createUserSession } from "@/lib/auth";

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

  const email =
    isRecord(body) && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const password =
    isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length === 0 ||
    password.length > 256
  ) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const passwordHash = String(rows[0].password_hash ?? "");
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createUserSession(email);
    return NextResponse.json({ authenticated: true, email });
  } catch (error) {
    console.error("User login failed:", error);
    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 },
    );
  }
}
