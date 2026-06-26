import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sales_orders_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    const userId = request.cookies.get(SESSION_COOKIE)?.value;
    if (!userId) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/agent/:path*", "/manager/:path*"],
};
