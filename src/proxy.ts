import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await auth();
  const role = session?.user?.role;

  // Protect /admin routes for admins only.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session?.user) {
      const loginUrl = new URL("/admin/login", request.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/account", request.nextUrl));
    }
  }

  // Redirect authenticated users away from admin login page.
  if (pathname === "/admin/login") {
    if (session?.user) {
      return NextResponse.redirect(new URL(role === "ADMIN" ? "/admin" : "/account", request.nextUrl));
    }
  }

  const isPublicAccountRoute = pathname === "/account/login" || pathname === "/account/setup";

  if (pathname.startsWith("/account") && !isPublicAccountRoute) {
    if (!session?.user) {
      const loginUrl = new URL("/account/login", request.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isPublicAccountRoute && session?.user) {
    return NextResponse.redirect(new URL("/account", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
