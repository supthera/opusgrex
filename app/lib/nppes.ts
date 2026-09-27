/**
 * NPPES / NPI Registry client for OpusGrex clinicians-for-hire (v1).
 *
 * Tradeoff: live Registry API instead of monthly bulk (~1GB).
 * Pros: no storage/ETL, fresh daily data, fits serverless.
 * Cons: max 200 results/request and skip≤1000 (≤1200 per query);
 * cannot enumerate the full national roster without bulk ingest.
 * See docs note in public-clinician-data-sources.md.
 */

export const CLINICIAN_ROLES = ["PT", "PTA", "OT", "OTA"] as const;
export type ClinicianRole = (typeof CLINICIAN_ROLES)[number];

export const ROLE_LABELS: Record<ClinicianRole, string> = {
  PT: "Physical Therapist",
  PTA: "Physical Therapy Assistant",
  OT: "Occupational Therapist",
  OTA: "Occupational Therapy Assistant",
};

/** NUCC classification codes + specialty prefixes for role assignment. */
const ROLE_TAXONOMY: Record<
  ClinicianRole,
  { codes: string[]; prefixes: string[]; description: string }
> = {
  PT: {
    codes: ["225100000X"],
    prefixes: ["2251"],
    description: "Physical Therapist",
  },
  PTA: {
    codes: ["225200000X"],
    prefixes: ["2252"],
    description: "Physical Therapy Assistant",
  },
  OT: {
    codes: ["225X00000X"],
    prefixes: ["225X"],
    description: "Occupational Therapist",
  },
  OTA: {
    codes: ["224Z00000X"],
    prefixes: ["224Z"],
    description: "Occupational Therapy Assistant",
  },
};

const NPPES_API = "https://npiregistry.cms.hhs.gov/api/";
const MAX_LIMIT = 200;
const MAX_SKIP = 1000;

export interface Clinician {
  npi: string;
  displayName: string;
  credential: string | null;
  role: ClinicianRole;
  taxonomyCode: string;
  taxonomyDesc: string;
  /** Self-reported on NPPES taxonomy — not board-verified. */
  reportedLicenseNumber: string | null;
  reportedLicenseState: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  npiActive: boolean;
  enumerationDate: string | null;
  lastUpdated: string | null;
  sourceLabel: "NPI-enumerated";
}

export interface SearchCliniciansParams {
  role?: ClinicianRole;
  state?: string;
  city?: string;
  lastName?: string;
  /** 1-based page; each page is up to `limit` results. */
  page?: number;
  limit?: number;
}

export interface SearchCliniciansResult {
  clinicians: Clinician[];
  resultCount: number;
  page: number;
  limit: number;
  skip: number;
  hasMore: boolean;
  /** True when further skip would exceed NPPES API cap. */
  apiSkipCapped: boolean;
  source: "nppes-registry-api";
  disclaimer: string;
}

interface NppesTaxonomy {
  code?: string;
  desc?: string;
  license?: string;
  state?: string;
  primary?: boolean;
}

interface NppesAddress {
  address_purpose?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country_code?: string;
}

interface NppesResult {
  number?: string;
  enumeration_type?: string;
  basic?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    name_prefix?: string;
    name_suffix?: string;
    credential?: string;
    status?: string;
    enumeration_date?: string;
    last_updated?: string;
  };
  taxonomies?: NppesTaxonomy[];
  addresses?: NppesAddress[];
}

interface NppesResponse {
  result_count?: number;
  results?: NppesResult[];
  Errors?: Array<{ description?: string }>;
}

export const NPPES_DISCLAIMER =
  "Listings come from the CMS NPPES NPI Registry. An active NPI means the identifier is enumerated — it does not verify state licensure, credentials, or availability to hire. Taxonomy and license numbers are self-reported.";

function isClinicianRole(value: string): value is ClinicianRole {
  return (CLINICIAN_ROLES as readonly string[]).includes(value);
}

export function parseClinicianRole(
  value: string | null | undefined
): ClinicianRole | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return isClinicianRole(upper) ? upper : undefined;
}

function taxonomyMatchesRole(code: string, role: ClinicianRole): boolean {
  const { codes, prefixes } = ROLE_TAXONOMY[role];
  if (codes.includes(code)) return true;
  // Specialty children share the classification prefix (e.g. 2251* for PT).
  return prefixes.some((prefix) => code.startsWith(prefix));
}

function resolveRole(
  taxonomies: NppesTaxonomy[],
  preferred?: ClinicianRole
): { role: ClinicianRole; taxonomy: NppesTaxonomy } | null {
  const ordered = [
    ...taxonomies.filter((t) => t.primary),
    ...taxonomies.filter((t) => !t.primary),
  ];

  if (preferred) {
    const match = ordered.find(
      (t) => t.code && taxonomyMatchesRole(t.code, preferred)
    );
    if (match?.code) return { role: preferred, taxonomy: match };
    return null;
  }

  for (const role of CLINICIAN_ROLES) {
    const match = ordered.find(
      (t) => t.code && taxonomyMatchesRole(t.code, role)
    );
    if (match?.code) return { role, taxonomy: match };
  }
  return null;
}

function pickPracticeAddress(
  addresses: NppesAddress[] | undefined
): NppesAddress | null {
  if (!addresses?.length) return null;
  const location = addresses.find((a) => a.address_purpose === "LOCATION");
  return location ?? addresses[0] ?? null;
}

function formatDisplayName(basic: NppesResult["basic"]): string {
  if (!basic) return "Unknown";
  const clean = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed || /^-+$/.test(trimmed)) return undefined;
    return trimmed;
  };
  const parts = [
    clean(basic.name_prefix),
    clean(basic.first_name),
    clean(basic.middle_name),
    clean(basic.last_name),
    clean(basic.name_suffix),
  ].filter(Boolean);
  return parts.join(" ") || "Unknown";
}

function mapClinician(
  raw: NppesResult,
  preferredRole?: ClinicianRole
): Clinician | null {
  if (raw.enumeration_type && raw.enumeration_type !== "NPI-1") return null;
  if (!raw.number) return null;

  const status = raw.basic?.status?.toUpperCase();
  const npiActive = status === "A" || status === undefined;
  if (status && status !== "A") return null;

  const resolved = resolveRole(raw.taxonomies ?? [], preferredRole);
  if (!resolved) return null;

  const address = pickPracticeAddress(raw.addresses);
  const { role, taxonomy } = resolved;

  return {
    npi: raw.number,
    displayName: formatDisplayName(raw.basic),
    credential: raw.basic?.credential ?? null,
    role,
    taxonomyCode: taxonomy.code ?? "",
    taxonomyDesc: taxonomy.desc ?? ROLE_LABELS[role],
    reportedLicenseNumber: taxonomy.license || null,
    reportedLicenseState: taxonomy.state || null,
    city: address?.city ?? null,
    state: address?.state ?? null,
    postalCode: address?.postal_code?.slice(0, 5) ?? null,
    npiActive,
    enumerationDate: raw.basic?.enumeration_date ?? null,
    lastUpdated: raw.basic?.last_updated ?? null,
    sourceLabel: "NPI-enumerated",
  };
}

function buildNppesUrl(params: {
  role: ClinicianRole;
  state?: string;
  city?: string;
  lastName?: string;
  limit: number;
  skip: number;
}): string {
  const url = new URL(NPPES_API);
  url.searchParams.set("version", "2.1");
  url.searchParams.set("enumeration_type", "NPI-1");
  url.searchParams.set(
    "taxonomy_description",
    ROLE_TAXONOMY[params.role].description
  );
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("skip", String(params.skip));
  url.searchParams.set("pretty", "false");

  if (params.state) url.searchParams.set("state", params.state.toUpperCase());
  if (params.city) url.searchParams.set("city", params.city);
  if (params.lastName) url.searchParams.set("last_name", params.lastName);

  // NPPES requires state not be the sole criterion when used; taxonomy covers that.
  // If only taxonomy is set, broad national queries work but are slower / capped.
  return url.toString();
}

export async function searchClinicians(
  params: SearchCliniciansParams = {}
): Promise<SearchCliniciansResult> {
  const role = params.role ?? "PT";
  const limit = Math.min(Math.max(params.limit ?? 25, 1), MAX_LIMIT);
  const page = Math.max(params.page ?? 1, 1);
  const skip = Math.min((page - 1) * limit, MAX_SKIP);
  const apiSkipCapped = (page - 1) * limit > MAX_SKIP;

  if (apiSkipCapped) {
    return {
      clinicians: [],
      resultCount: 0,
      page,
      limit,
      skip: MAX_SKIP,
      hasMore: false,
      apiSkipCapped: true,
      source: "nppes-registry-api",
      disclaimer: NPPES_DISCLAIMER,
    };
  }

  const state = params.state?.trim().toUpperCase() || undefined;
  const city = params.city?.trim() || undefined;
  const lastName = params.lastName?.trim() || undefined;

  const url = buildNppesUrl({ role, state, city, lastName, limit, skip });

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`NPPES Registry request failed (${res.status})`);
  }

  const data = (await res.json()) as NppesResponse;

  if (data.Errors?.length) {
    throw new Error(
      data.Errors.map((e) => e.description).filter(Boolean).join("; ") ||
        "NPPES Registry returned an error"
    );
  }

  const clinicians = (data.results ?? [])
    .map((row) => mapClinician(row, role))
    .filter((c): c is Clinician => c !== null);

  // NPPES `result_count` reflects this response page, not a national total.
  const resultCount = clinicians.length;
  const hasMore =
    (data.results?.length ?? 0) >= limit && skip + limit <= MAX_SKIP;

  return {
    clinicians,
    resultCount,
    page,
    limit,
    skip,
    hasMore,
    apiSkipCapped: false,
    source: "nppes-registry-api",
    disclaimer: NPPES_DISCLAIMER,
  };
}
