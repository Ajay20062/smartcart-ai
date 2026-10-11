import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "smartcart_session";
const USER_COOKIE_NAME = "smartcart_user_session";

export async function proxy(request: NextRequest) {
  const secret = process.env.SESSION_SECRET;
  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith("/api/");
  const isUserRoute =
    pathname.startsWith("/users/") || pathname.startsWith("/api/users/");
  const isPublicUserRoute = [
    "/users/login",
    "/users/signup",
    "/api/users/login",
    "/api/users/signup",
  ].includes(pathname);

  if (isPublicUserRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(
    isUserRoute ? USER_COOKIE_NAME : COOKIE_NAME,
  )?.value;
  let authenticated = false;

  if (secret && new TextEncoder().encode(secret).length >= 32 && token) {
    try {
      if (isUserRoute) {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
          {
            issuer: "smartcart-ai",
            audience: "smartcart-user",
            algorithms: ["HS256"],
          },
        );

        authenticated =
          payload.role === "user" && typeof payload.email === "string";
      } else {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
          {
            issuer: "smartcart-ai",
            audience: "smartcart-creator",
            algorithms: ["HS256"],
          },
        );

        authenticated =
          payload.role === "creator" &&
          typeof payload.email === "string" &&
          payload.email.toLowerCase() ===
            process.env.CREATOR_LOGIN_EMAIL?.trim().toLowerCase();
      }
    } catch {
      authenticated = false;
    }
  }

  if (authenticated) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const loginUrl = new URL(isUserRoute ? "/users/login" : "/login", request.url);
  loginUrl.searchParams.set("next", isUserRoute ? "/users/dashboard" : "/dashboard");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/users/:path*",
    "/api/dashboard/:path*",
    "/api/users/:path*",
  ],
};
