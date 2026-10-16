"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import ClinicianTable from "@/components/ClinicianTable";
import { trackDownloadCSV } from "@/lib/analytics";
import {
  Clinician,
  ClinicianStatsFile,
  StateShardFile,
  US_STATES,
} from "@/types/clinician";

// Where per-state record shards are served from. Defaults to same-origin static
// files in public/data/states. In production, set
// NEXT_PUBLIC_SHARD_BASE to the GitHub Release download base, e.g.
// https://github.com/supthera/opusgrex/releases/download/data-latest
const SHARD_BASE = process.env.NEXT_PUBLIC_SHARD_BASE || "/data/states";

const MapDashboardPanel = dynamic(
  () => import("@/components/MapDashboardPanel"),
  {
    loading: () => (
      <div className="h-96 w-full animate-pulse rounded-lg bg-gray-900" />
    ),
  }
);

function getStateFlagName(stateCode: string): string {
  const flagNameMap: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado_designed_by_Andrew_Carlisle_Carson",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia_(U.S._state)",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New_Hampshire",
    NJ: "New_Jersey",
    NM: "New_Mexico",
    NY: "New_York",
    NC: "North_Carolina",
    ND: "North_Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode_Island",
    SC: "South_Carolina",
    SD: "South_Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West_Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "the_District_of_Columbia",
    PR: "Puerto_Rico",
    VI: "the_United_States_Virgin_Islands",
    GU: "Guam",
    AS: "American_Samoa",
    MP: "the_Northern_Mariana_Islands",
  };
  return flagNameMap[stateCode] || stateCode;
}

function generateCliniciansCSV(clinicians: Clinician[]): string {
  const headers = [
    "City",
    "Last Name",
    "First Name",
    "Credential",
    "Specialty",
    "Taxonomy Code",
    "NPI",
    "Address",
    "Zip Code",
    "Phone",
    "Last Updated",
  ];

  const rows = clinicians.map((c) => [
    `"${c.city}"`,
    `"${c.lastName}"`,
    `"${c.firstName}"`,
    `"${c.credential || ""}"`,
    `"${c.taxonomyLabel}"`,
    c.taxonomyCode,
    c.npi,
    `"${c.address || ""}"`,
    c.zipCode,
    c.phone || "",
    c.lastUpdated,
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function downloadCSV(csv: string, filename: string): void {
  const element = document.createElement("a");
  const file = new Blob([csv], { type: "text/csv" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

interface StateEntry {
  state: string;
  stateName: string;
  count: number;
}

type ShardStatus = "idle" | "loading" | "loaded" | "empty" | "error";

/**
 * Build the per-state list (counts only) from the committed stats file.
 * Records themselves are lazy-loaded per state on expansion.
 */
async function buildStateList(): Promise<StateEntry[]> {
  try {
    const response = await fetch("/data/stateStats.json");
    const stats = (await response.json()) as ClinicianStatsFile;
    const states = stats.states || {};

    return Object.keys(US_STATES)
      .map((state) => ({
        state,
        stateName: US_STATES[state],
        count: states[state]?.totalClinicians ?? 0,
      }))
      .sort((a, b) => a.state.localeCompare(b.state));
  } catch (error) {
    console.error("Failed to load clinician stats:", error);
    return Object.keys(US_STATES)
      .map((state) => ({ state, stateName: US_STATES[state], count: 0 }))
      .sort((a, b) => a.state.localeCompare(b.state));
  }
}

export default function HomePage() {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [stateList, setStateList] = useState<StateEntry[]>([]);
  const [mapSpecialty, setMapSpecialty] = useState('');
  const [specialtyCountsByState, setSpecialtyCountsByState] = useState<
    Record<string, Record<string, number>>
  >({});
  const [cliniciansByState, setCliniciansByState] = useState<
    Record<string, Clinician[]>
  >({});
  const [shardStatus, setShardStatus] = useState<Record<string, ShardStatus>>(
    {}
  );

  useEffect(() => {
    buildStateList().then(setStateList);
  }, []);

  useEffect(() => {
    fetch('/data/stateStats.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load stateStats'))))
      .then((stateStats) => {
        const specialtyByState: Record<string, Record<string, number>> = {};
        Object.entries(stateStats.states || {}).forEach(
          ([stateCode, stateData]: [string, { byTaxonomy?: Record<string, number> }]) => {
            specialtyByState[stateCode] = stateData.byTaxonomy || {};
          }
        );
        setSpecialtyCountsByState(specialtyByState);
      })
      .catch(() => setSpecialtyCountsByState({}));
  }, []);

  // Lazy-load a state's clinician shard the first time it's expanded.
  const loadStateShard = useCallback(
    (stateCode: string) => {
      setShardStatus((prev) => {
        if (prev[stateCode] && prev[stateCode] !== "error") return prev;
        return { ...prev, [stateCode]: "loading" };
      });

      fetch(`${SHARD_BASE}/${stateCode}.json`)
        .then((res) => {
          if (res.status === 404) return null;
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<StateShardFile>;
        })
        .then((shard) => {
          if (!shard) {
            setShardStatus((prev) => ({ ...prev, [stateCode]: "empty" }));
            return;
          }
          setCliniciansByState((prev) => ({
            ...prev,
            [stateCode]: shard.clinicians || [],
          }));
          setShardStatus((prev) => ({ ...prev, [stateCode]: "loaded" }));
        })
        .catch((err) => {
          console.error(`Failed to load shard for ${stateCode}:`, err);
          setShardStatus((prev) => ({ ...prev, [stateCode]: "error" }));
        });
    },
    []
  );

  const handleStateClick = (stateCode: string | null) => {
    if (stateCode) {
      setExpandedStates((prev) => new Set(prev).add(stateCode));
      loadStateShard(stateCode);
      setTimeout(() => {
        document
          .getElementById(`state-${stateCode}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const toggleStateExpansion = (stateCode: string) => {
    const isCurrentlyExpanded = expandedStates.has(stateCode);

    setExpandedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateCode)) {
        next.delete(stateCode);
      } else {
        next.add(stateCode);
      }
      return next;
    });

    if (!isCurrentlyExpanded) {
      loadStateShard(stateCode);
      setTimeout(() => {
        document
          .getElementById(`state-${stateCode}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }

    if (isCurrentlyExpanded) {
      const deselectAudio = new Audio("/Deselect_Tap_for_state_TAC.mp3");
      deselectAudio.volume = 0.25;
      deselectAudio.play().catch(() => undefined);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
  };

  return (
    <>
      <Script
        src="https://code.jquery.com/jquery-3.7.1.min.js"
        strategy="beforeInteractive"
      />
      <Script src="/raphael.js" strategy="beforeInteractive" />
      <Script src="/jquery.usmap.js" strategy="beforeInteractive" />

      <div
        className="w-full bg-[#020202]"
        style={{ borderBottom: "1px solid #3d3d3d" }}
      >
        <div className="flex w-full justify-center px-4 lg:px-8">
          <div style={{ width: "100%", maxWidth: "1200px" }}>
            <MapDashboardPanel
              onStateClick={handleStateClick}
              expandedStates={expandedStates}
              selectedSpecialty={mapSpecialty}
              onSpecialtyChange={setMapSpecialty}
            />
          </div>
        </div>
      </div>

      <section
        className={`mid-section ${expandedStates.size > 0 ? "has-expanded-panel" : ""}`}
      >
        <div className="mx-auto max-w-[1200px] px-12">
          {stateList.map((stateData) => {
            const isExpanded = expandedStates.has(stateData.state);
            const status = shardStatus[stateData.state] ?? "idle";
            const clinicians = cliniciansByState[stateData.state] ?? [];
            const panelClinicians = mapSpecialty
              ? clinicians.filter((c) => c.taxonomyLabel === mapSpecialty)
              : clinicians;
            const displayedCount = mapSpecialty
              ? (specialtyCountsByState[stateData.state]?.[mapSpecialty] ??
                (status === "loaded" ? panelClinicians.length : stateData.count))
              : stateData.count;
            return (
              <div
                key={stateData.state}
                id={`state-${stateData.state}`}
                className="mb-8 scroll-mt-4"
              >
                <div
                  className={`state-panel-container ${isExpanded ? "expanded" : ""}`}
                >
                  <div
                    className="state-panel-header"
                    onClick={() => toggleStateExpansion(stateData.state)}
                  >
                    <div className="state-panel-header-left flex-1">
                      <div
                        className="state-panel-header-label"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        {stateData.state}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/flags/Flag_of_${getStateFlagName(stateData.state)}.svg`}
                          alt={`${stateData.stateName} flag`}
                          width={67}
                          height={40}
                          style={{
                            height: "40px",
                            width: "67px",
                            borderRadius: "2px",
                            border: "none",
                            outline: "none",
                            boxShadow: "none",
                          }}
                        />
                      </div>
                      <h2>{stateData.stateName}</h2>
                    </div>

                    <div className="state-panel-header-right">
                      <div>
                        <div className="state-panel-header-label">
                          Total Clinicians
                        </div>
                        <div className="state-panel-agency-count">
                          {displayedCount.toLocaleString()}
                        </div>
                      </div>
                      <div
                        className={`state-panel-chevron ${isExpanded ? "expanded" : ""}`}
                      >
                        ▼
                      </div>
                    </div>
                  </div>

                  {!isExpanded && (
                    <div
                      style={{
                        paddingLeft: "2rem",
                        paddingBottom: "1rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontStyle: "italic",
                      }}
                    >
                      Click to view clinicians...
                    </div>
                  )}

                  {isExpanded && (
                    <div
                      style={{
                        paddingLeft: "2rem",
                        paddingRight: "2rem",
                        paddingBottom: "1.5rem",
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {status === "loading" && (
                        <div
                          style={{
                            padding: "2rem",
                            textAlign: "center",
                            color: "#9ca3af",
                          }}
                        >
                          Loading clinicians…
                        </div>
                      )}

                      {status === "error" && (
                        <div
                          style={{
                            padding: "2rem",
                            textAlign: "center",
                            color: "#f87171",
                          }}
                        >
                          Failed to load clinicians for {stateData.stateName}.
                        </div>
                      )}

                      {status === "empty" && (
                        <div
                          style={{
                            padding: "2rem",
                            textAlign: "center",
                            color: "#9ca3af",
                          }}
                        >
                          {stateData.count > 0 ? (
                            <>
                              No shard is currently available for{" "}
                              {stateData.stateName} ({stateData.count.toLocaleString()}{" "}
                              clinicians counted in stats). Configure{" "}
                              <code>NEXT_PUBLIC_SHARD_BASE</code> to your full
                              monthly shard source.
                            </>
                          ) : (
                            <>No clinicians currently available for {stateData.stateName}.</>
                          )}
                        </div>
                      )}

                      {status === "loaded" && (
                        <>
                          <ClinicianTable clinicians={panelClinicians} />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "0.5rem",
                              marginTop: "auto",
                              paddingTop: "1.5rem",
                            }}
                          >
                            <a
                              href={`/state/${stateData.state.toLowerCase()}`}
                              title={`View ${stateData.stateName} state page`}
                              style={{
                                padding: "0.5rem",
                                backgroundColor: "transparent",
                                border: "1px solid #4d4d4d",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                color: "#e5e7eb",
                                textDecoration: "none",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#2d2d2d";
                                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                                  "#6b7280";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "transparent";
                                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                                  "#4d4d4d";
                              }}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="7 2 2 2 2 7" />
                                <polyline points="17 2 22 2 22 7" />
                                <polyline points="7 22 2 22 2 17" />
                                <polyline points="17 22 22 22 22 17" />
                              </svg>
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
