import "server-only";

import type { RowDataPacket } from "mysql2";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

const COOKIE_NAME = "smartcart_session";
const USER_COOKIE_NAME = "smartcart_user_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSecret() {
  const value = process.env.SESSION_SECRET;

  if (!value || new TextEncoder().encode(value).length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 bytes.");
  }

  return new TextEncoder().encode(value);
}

export async function createSession(email: string) {
  const token = await new SignJWT({ email, role: "creator" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .setIssuer("smartcart-ai")
    .setAudience("smartcart-creator")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function createUserSession(email: string) {
  const token = await new SignJWT({ email, role: "user" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .setIssuer("smartcart-ai")
    .setAudience("smartcart-user")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getCreatorSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "smartcart-ai",
      audience: "smartcart-creator",
      algorithms: ["HS256"],
    });
    const configuredEmail = process.env.CREATOR_LOGIN_EMAIL?.trim().toLowerCase();

    if (
      !configuredEmail ||
      payload.role !== "creator" ||
      typeof payload.email !== "string" ||
      payload.email.toLowerCase() !== configuredEmail
    ) {
      return null;
    }

    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function getUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "smartcart-ai",
      audience: "smartcart-user",
      algorithms: ["HS256"],
    });

    if (payload.role !== "user" || typeof payload.email !== "string") {
      return null;
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail],
    );

    if (rows.length === 0) {
      return null;
    }

    return { email: normalizedEmail };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
