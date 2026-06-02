/**
 * Agency Metrics - Single Source of Truth
 * 
 * This file is automatically updated by scripts/update-agency-metrics.js
 * on every build to reflect the current total from public/data/stateStats.json
 * 
 * DO NOT manually edit the values below. They are auto-generated.
 * Generated at: 2026-05-07T18:23:05.784Z
 */

export const AGENCY_METRICS = {
  // Total number of Medicare-certified home health agencies in the directory
  totalAgencies: 12392,
  
  // Timestamp of when these metrics were last updated
  lastUpdated: '2026-05-07T18:23:05.784Z',
  
  // Display format for meta tags and SEO descriptions
  get displayTotal() {
    return `${this.totalAgencies.toLocaleString()}`;
  },
  
  // Marketing format with + suffix (implies "and growing")
  get displayTotalPlus() {
    return `${this.totalAgencies.toLocaleString()}+`;
  },
  
  // Full timestamp for transparency
  get lastUpdatedFormatted() {
    try {
      return new Date(this.lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return this.lastUpdated;
    }
  },
} as const;

// Re-export for convenience
export const TOTAL_AGENCIES = AGENCY_METRICS.totalAgencies;
export const TOTAL_AGENCIES_DISPLAY = AGENCY_METRICS.displayTotalPlus;
