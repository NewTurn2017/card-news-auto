import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/login", "/signup"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    // Redirect OAuth code exchange to API route (edge runtime workaround)
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (code && request.method === "GET") {
      const apiUrl = new URL("/api/auth", request.url);
      apiUrl.searchParams.set("code", code);
      return NextResponse.redirect(apiUrl);
    }

    if (!isPublicRoute(request) && !(await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/login");
    }
  },
  { verbose: true },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
