import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";

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
  const expectedEmail = process.env.CREATOR_LOGIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.CREATOR_PASSWORD_HASH;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!expectedEmail || !passwordHash || !sessionSecret) {
    console.error("Creator login environment variables are missing.");
    return NextResponse.json(
      { error: "Creator login is not configured." },
      { status: 500 },
    );
  }

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
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (email !== expectedEmail || !passwordMatches) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    await createSession(expectedEmail);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 },
    );
  }
}
