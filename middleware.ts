import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth.token as any)?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN" && role !== "MODERATEUR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/connexion" },
  }
);

export const config = {
  matcher: ["/decouverte/:path*", "/messagerie/:path*", "/admin/:path*"],
};
