import { NextRequest, NextResponse } from "next/server";

import { buildRosterResponse } from "@/app/lib/ca-board-api";
import {
  CA_PROFESSIONS,
  RECRUITING_STATES,
  type CaProfession,
  type RecruitingState,
} from "@/app/lib/ca-board-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ state: string; profession: string }> }
) {
  const { state: stateParam, profession: professionParam } = await context.params;
  const state = stateParam.toLowerCase();
  const profession = professionParam.toLowerCase();

  if (!RECRUITING_STATES.includes(state as RecruitingState)) {
    return NextResponse.json({ error: "Unknown state" }, { status: 404 });
  }
  if (!CA_PROFESSIONS.includes(profession as CaProfession)) {
    return NextResponse.json({ error: "Unknown profession" }, { status: 404 });
  }

  try {
    const sp = request.nextUrl.searchParams;
    const result = await buildRosterResponse(
      profession as CaProfession,
      {
        page: sp.get("page") || undefined,
        pageSize: sp.get("pageSize") || undefined,
        q: sp.get("q") || undefined,
        confidence: sp.get("confidence") || undefined,
        contact: sp.get("contact") || undefined,
        county: sp.get("county") || undefined,
        professions: sp.get("professions") || undefined,
        export: sp.get("export") || undefined,
      },
      state as RecruitingState
    );

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
      error instanceof Error ? error.message : "Failed to load roster";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
