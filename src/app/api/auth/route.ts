import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, args } = body;

  if (action !== "auth:signIn" && action !== "auth:signOut") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await fetchAction(action, args);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error in ${action}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const cookieStore = await cookies();
  const verifier = cookieStore.get("__convex_auth_verifier")?.value;

  const redirectUrl = new URL("/", request.url);

  try {
    const result = await fetchAction("auth:signIn" as any, {
      params: { code },
      verifier,
    });

    const response = NextResponse.redirect(redirectUrl);

    if (result.tokens) {
      response.cookies.set("__convex_auth_token", result.tokens.token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
      response.cookies.set(
        "__convex_auth_refresh_token",
        result.tokens.refreshToken,
        {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        },
      );
    }

    response.cookies.delete("__convex_auth_verifier");
    return response;
  } catch (error) {
    console.error("Code exchange error:", error);
    return NextResponse.redirect(redirectUrl);
  }
}
