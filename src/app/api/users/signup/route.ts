import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
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

  const name =
    isRecord(body) && typeof body.name === "string" ? body.name.trim() : "";
  const email =
    isRecord(body) && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
  const password =
    isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { error: "Name must be between 2 and 120 characters." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8 || password.length > 256) {
    return NextResponse.json(
      { error: "Password must be between 8 and 256 characters." },
      { status: 400 },
    );
  }

  try {
    const [existingRows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const id = randomUUID();

    await pool.execute(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [id, name, email, passwordHash],
    );

    await createUserSession(email);

    return NextResponse.json({ created: true, email });
  } catch (error) {
    console.error("User signup failed:", error);
    return NextResponse.json(
      { error: "Unable to create your account right now." },
      { status: 500 },
    );
  }
}
