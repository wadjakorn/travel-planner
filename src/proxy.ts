import { auth } from "@/lib/auth-edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Build the auth-gated handler once (only used when AUTH_BYPASS is off)
const authHandler = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnApp = req.nextUrl.pathname.startsWith("/trip");

  if (isOnApp && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export default async function proxy(req: NextRequest) {
  // Skip all auth checks in dev bypass mode
  if (process.env.AUTH_BYPASS === "true") {
    return NextResponse.next();
  }

  return authHandler(req, { params: Promise.resolve({}) });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
