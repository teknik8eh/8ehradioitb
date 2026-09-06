import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isReservedShortLinkSlug } from "@/lib/shortlinks/slug";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const slug = pathname.split("/")[1];

  // DEBUG - hapus setelah selesai
  console.log('pathname:', pathname);
  console.log('slug:', slug);
  console.log('isReserved:', isReservedShortLinkSlug(slug));

  // --- CORS handling for all API routes ---
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, Content-Range",
          "Access-Control-Max-Age": "86400",
          "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
        },
      });
    }
    return NextResponse.next();
  }

  if (pathname !== "/" && slug && !isReservedShortLinkSlug(slug)) {
    return NextResponse.rewrite(
      new URL(`/api/redirect${pathname}`, request.url),
    );
  }

  if (pathname.startsWith("/dashboard")) {
    const token =
      request.cookies.get("next-auth.session-token") ||
      request.cookies.get("__Secure-next-auth.session-token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};