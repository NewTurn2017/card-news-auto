import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { cookies } from "next/headers";
import type { SignInAction, SignOutAction } from "@convex-dev/auth/server";

type AuthProxyAction = "auth:signIn" | "auth:signOut";

type AuthProxyRequestBody =
  | {
      action: "auth:signIn";
      args: SignInAction["_args"];
    }
  | {
      action: "auth:signOut";
      args: SignOutAction["_args"];
    };

function isAuthProxyAction(value: unknown): value is AuthProxyAction {
  return value === "auth:signIn" || value === "auth:signOut";
}

function parseAuthProxyRequestBody(body: unknown): AuthProxyRequestBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const action = "action" in body ? body.action : undefined;
  const args = "args" in body ? body.args : undefined;

  if (!isAuthProxyAction(action) || !args || typeof args !== "object") {
    return null;
  }

  if (action === "auth:signIn") {
    return {
      action,
      args: args as SignInAction["_args"],
    };
  }

  return {
    action,
    args: args as SignOutAction["_args"],
  };
}

export async function POST(request: NextRequest) {
  const body = parseAuthProxyRequestBody(await request.json());

  if (!body) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result =
      body.action === "auth:signIn"
        ? await fetchAction("auth:signIn" as unknown as SignInAction, body.args)
        : await fetchAction("auth:signOut" as unknown as SignOutAction, body.args);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error in ${body.action}:`, error);
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
    const result = await fetchAction("auth:signIn" as unknown as SignInAction, {
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
