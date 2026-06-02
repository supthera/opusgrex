import { Agency } from '@/types/agency';
import { getMedicalBusinessSchema } from './agencySchemas';

/**
 * LEVEL 3: City Group Schema
 * Generates ItemList schema for all agencies in a specific city within a state
 * Contains full MedicalBusiness schemas for each agency
 */
export function getCityGroupItemListSchema(
  agencies: Agency[],
  city: string,
  stateCode: string,
  stateName: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Home Health Agencies in ${city}, ${stateCode}`,
    "description": `Find ${agencies.length} Medicare-certified home health agencies in ${city}, ${stateName}. Services include nursing care, physical therapy, occupational therapy, speech therapy, medical social work, and home health aide services.`,
    "url": `https://medicareagencyfinder.com/state/${stateCode.toLowerCase()}/#city-${city.toLowerCase().replace(/\s+/g, '-')}`,
    "numberOfItems": agencies.length,
    
    // Link back to parent (state level)
    "isPartOf": {
      "@type": "ItemList",
      "name": `Home Health Agencies in ${stateName}`,
      "url": `https://medicareagencyfinder.com/state/${stateCode.toLowerCase()}/`
    },
    
    // Geographic context
    "spatialCoverage": {
      "@type": "City",
      "name": city,
      "containedIn": {
        "@type": "State",
        "name": stateName
      }
    },
    
    // All agencies in this city
    "itemListElement": agencies.map((agency, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": agency.providerName,
      "item": getMedicalBusinessSchema(agency, stateCode, stateName)
    }))
  };
}

/**
 * Lightweight version for just referencing the city without full agency details
 * Used for the state-level city list
 */
export function getCityGroupReferenceSchema(
  cityName: string,
  agencyCount: number,
  stateCode: string,
  stateName: string
) {
  return {
    "@type": "ListItem",
    "position": undefined, // Will be set by parent
    "name": cityName,
    "url": `https://medicareagencyfinder.com/state/${stateCode.toLowerCase()}/#city-${cityName.toLowerCase().replace(/\s+/g, '-')}`,
    "description": `${agencyCount} Medicare-certified home health agencies in ${cityName}, ${stateName}`
  };
}
