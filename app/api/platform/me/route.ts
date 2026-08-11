import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
export async function GET(request: NextRequest) {
  const access = await requirePlatformAdmin(request);
  if (!access.ok) return access.response;
  return NextResponse.json({ admin: true, role: access.role, email: access.user.email });
}
