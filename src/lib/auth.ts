import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(_request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return session;
} 