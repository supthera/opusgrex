import { NextRequest, NextResponse } from "next/server";

import {
  parseClinicianRole,
  searchClinicians,
} from "@/app/lib/nppes";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const role = parseClinicianRole(searchParams.get("role") ?? undefined);
  const state = searchParams.get("state") ?? undefined;
  const city = searchParams.get("city") ?? undefined;
  const lastName = searchParams.get("lastName") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "25");

  try {
    const result = await searchClinicians({
      role,
      state: state || undefined,
      city: city || undefined,
      lastName: lastName || undefined,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 25,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to query NPPES";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
