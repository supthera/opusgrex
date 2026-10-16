// Schema for NPPES Type 1 individual clinicians, organized by state.
// This replaces the home-health Agency shape as the data feeding the state panels.

import { US_STATES } from "./agency";
import type { TaxonomyCategory } from "@/lib/nppesTaxonomies";

export type { TaxonomyCategory };

/**
 * A single clinician record derived from one NPPES Type 1 NPI row.
 * `npi` is the stable unique key used for incremental diffing.
 */
export interface Clinician {
  npi: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  /** Provider credential text from NPPES (e.g. "RN", "PT, DPT"). */
  credential?: string;
  /** Primary NPPES taxonomy code (10 chars). */
  taxonomyCode: string;
  /** Friendly specialty label resolved from the taxonomy allowlist. */
  taxonomyLabel: string;
  category: TaxonomyCategory;
  /** State license number from NPPES, when the record includes one. */
  licenseNumber?: string;
  /** Practice-location street address (line 1, optionally "+ line 2"). */
  address?: string;
  /** Practice-location city. */
  city: string;
  /** Practice-location state (2-letter). */
  state: string;
  zipCode: string;
  phone?: string;
  /** NPPES "Last Update Date" (ISO string). */
  lastUpdated: string;
  /** True when the NPI carries a deactivation date. */
  deactivated?: boolean;
}

/** In-memory grouping used by the homepage accordion. */
export interface StateClinicians {
  state: string;
  stateName: string;
  clinicians: Clinician[];
  count: number;
}

/** Per-state summary committed to the repo; drives the map + panel counts. */
export interface StateClinicianStats {
  name: string;
  totalClinicians: number;
  /** Counts keyed by friendly taxonomy label. */
  byTaxonomy: Record<string, number>;
  /** Counts keyed by category (Nursing/Therapy/Technician/Other). */
  byCategory: Record<string, number>;
  lastUpdated: string;
}

/** Top-level shape of public/data/stateStats.json. */
export interface ClinicianStatsFile {
  meta: {
    totalClinicians: number;
    lastUpdated: string;
    source: string;
    note?: string;
  };
  states: Record<string, StateClinicianStats>;
}

/** Top-level shape of a per-state shard, e.g. public/data/states/CA.json. */
export interface StateShardFile {
  meta: {
    state: string;
    stateName: string;
    count: number;
    lastUpdated: string;
  };
  clinicians: Clinician[];
}

export { US_STATES };
