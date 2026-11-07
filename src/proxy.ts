import { NextResponse, type NextRequest } from "next/server";
import { readSecurity, SESSION_COOKIE, verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/desbloquear") return NextResponse.next();

  const sec = await readSecurity();
  if (sec && verifyToken(sec, req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (req.method === "GET" && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = "/desbloquear";
    url.search = pathname === "/" ? "" : `?de=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return new NextResponse("Caderninho bloqueado", { status: 401 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon.png|manifest.webmanifest|favicon.ico).*)"],
};
