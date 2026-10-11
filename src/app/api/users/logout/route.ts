import { NextResponse } from "next/server";
import { destroyUserSession } from "@/lib/auth";

export async function POST() {
  await destroyUserSession();
  return NextResponse.json({ authenticated: false });
}
