import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "zb-auth";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (token && token === process.env.DASHBOARD_SESSION_TOKEN) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/|favicon|zerobi-).*)"],
};
