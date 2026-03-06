import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";

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
