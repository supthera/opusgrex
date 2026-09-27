import { NextResponse } from "next/server";

import { loadCaBoardRoster } from "@/app/lib/ca-board";

export const dynamic = "force-static";

export async function GET() {
  try {
    const roster = await loadCaBoardRoster("ot");
    return NextResponse.json(
      {
        generatedAt: roster.generatedAt,
        profession: roster.profession,
        disclaimer: roster.disclaimer,
        stats: roster.stats,
        clinicians: roster.clinicians,
        unmatchedBoard: roster.unmatchedBoard ?? [],
        backlogNoContactCount: roster.stats.matchedNoContact,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load CA OT roster";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
