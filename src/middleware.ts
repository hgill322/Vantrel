import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken, type Role } from "@/lib/auth";

const STAFF_ONLY_PREFIXES = ["/ops", "/requests"];
const LANDLORD_PREFIXES = ["/landlord"];
const TENANT_PREFIXES = ["/portal"];

function homeFor(role: Role) {
  if (role === "staff") return "/ops";
  if (role === "landlord") return "/landlord";
  return "/portal";
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const path = req.nextUrl.pathname;
  const allowed =
    (STAFF_ONLY_PREFIXES.some((p) => path.startsWith(p)) && session.role === "staff") ||
    (LANDLORD_PREFIXES.some((p) => path.startsWith(p)) && (session.role === "staff" || session.role === "landlord")) ||
    (TENANT_PREFIXES.some((p) => path.startsWith(p)) && session.role === "tenant");

  if (!allowed) {
    const url = req.nextUrl.clone();
    url.pathname = homeFor(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ops/:path*", "/landlord/:path*", "/requests/:path*", "/portal/:path*"],
};
