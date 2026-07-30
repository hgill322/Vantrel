import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const STAFF_ONLY_PREFIXES = ["/ops", "/requests"];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (STAFF_ONLY_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p)) && session.role !== "staff") {
    const url = req.nextUrl.clone();
    url.pathname = "/landlord";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops/:path*", "/landlord/:path*", "/requests/:path*"],
};
