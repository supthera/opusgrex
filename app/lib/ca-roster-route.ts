import { NextRequest, NextResponse } from "next/server";

import { buildRosterResponse } from "@/app/lib/ca-board-api";
import type { CaProfession } from "@/app/lib/ca-board-types";

export function createRosterRoute(profession: CaProfession) {
  return async function GET(request: NextRequest) {
    try {
      const sp = request.nextUrl.searchParams;
      const result = await buildRosterResponse(profession, {
        page: sp.get("page") || undefined,
        pageSize: sp.get("pageSize") || undefined,
        q: sp.get("q") || undefined,
        confidence: sp.get("confidence") || undefined,
        contact: sp.get("contact") || undefined,
        county: sp.get("county") || undefined,
        export: sp.get("export") || undefined,
      });

      if (result.kind === "csv") {
        return new NextResponse(result.body, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${result.filename}"`,
            "Cache-Control": "no-store",
          },
        });
      }

      return NextResponse.json(result.body, {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to load CA ${profession.toUpperCase()} roster`;
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
