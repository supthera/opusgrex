import { Agency } from '@/types/agency';
import { TOTAL_AGENCIES_DISPLAY } from './constants/agencyMetrics';

/**
 * Helper: Calculate years in operation based on certification date
 */
function calculateYearsInOperation(certificationDate?: string): number {
  if (!certificationDate) return 0;
  try {
    const certified = new Date(certificationDate);
    const now = new Date();
    const years = now.getFullYear() - certified.getFullYear();
    return Math.max(0, years);
  } catch {
    return 0;
  }
}

/**
 * LEVEL 4: Individual Agency Schema (ENHANCED)
 * Generates MedicalBusiness + LocalBusiness + HomeHealthService schema
 * This is the leaf node in the trickle-down hierarchy
 * 
 * COMPETITIVE ENHANCEMENTS:
 * - HomeHealthService type for specificity
 * - Medicare insurance acceptance signals
 * - Regulatory approval badges from CMS
 * - Individual service offerings as Service objects
 * - Years in operation calculated from certification
 * - Specialization signals for care types
 * - Directory reference back to Medicare Agency Finder
 */
export function getMedicalBusinessSchema(
  agency: Agency,
  stateCode?: string,
  stateName?: string
) {
  // Helper function to convert service booleans to readable labels
  const getServices = (agency: Agency): string[] => {
    const services = [];
    if (agency.nursingCare) services.push("Nursing Care");
    if (agency.physicalTherapy) services.push("Physical Therapy");
    if (agency.occupationalTherapy) services.push("Occupational Therapy");
    if (agency.speechPathology) services.push("Speech Therapy");
    if (agency.medicalSocial) services.push("Medical Social Work");
    if (agency.homeHealthAide) services.push("Home Health Aide Services");
    return services.length > 0 ? services : ["Home Health Care"];
  };

  // Helper: Build service authority references based on what services agency offers
  const getServiceAuthorityReferences = () => {
    const refs = [];
    if (agency.nursingCare) refs.push({ "@id": "urn:maf:entity:nursing-care-authority" });
    if (agency.physicalTherapy) refs.push({ "@id": "urn:maf:entity:physical-therapy-authority" });
    if (agency.occupationalTherapy) refs.push({ "@id": "urn:maf:entity:occupational-therapy-authority" });
    if (agency.speechPathology) refs.push({ "@id": "urn:maf:entity:speech-therapy-authority" });
    if (agency.medicalSocial) refs.push({ "@id": "urn:maf:entity:social-work-authority" });
    if (agency.homeHealthAide) refs.push({ "@id": "urn:maf:entity:home-health-aide-authority" });
    return refs.length > 0 ? refs : [{ "@id": "urn:maf:entity:home-health-care-authority" }];
  };

  const services = getServices(agency);
  const yearsInOperation = calculateYearsInOperation(agency.certificationDate);

  return {
    "@context": "https://schema.org",
    "@type": [
      "MedicalBusiness",
      "LocalBusiness",
      "HomeHealthService"  // ENHANCED: More specific type
    ],
    "@id": `urn:cms:ccn:${agency.ccn}`,  // URN identifier - no URL needed
    "name": agency.providerName,
    
    // Certification - CRITICAL identifier
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "CMS-CCN",
      "value": agency.ccn
    },
    "certificationID": agency.ccn,
    
    // Location
    "address": {
      "@type": "PostalAddress",
      "streetAddress": agency.address,
      "addressLocality": agency.city,
      "addressRegion": stateCode || "US",
      "postalCode": agency.zipCode,
      "addressCountry": "US"
    },
    ...(agency.latitude && agency.longitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": agency.latitude,
        "longitude": agency.longitude
      }
    }),
    
    // Contact Information
    "telephone": agency.phone,
    "contactPoint": {  // ENHANCED: Structured contact
      "@type": "ContactPoint",
      "contactType": "Home Health Services",
      "telephone": agency.phone,
      "availableLanguage": ["en"]
    },
    "areaServed": [
      {
        "@type": "City",
        "name": agency.city,
        ...(stateName && {
          "containedIn": {
            "@type": "State",
            "name": stateName
          }
        })
      }
    ],
    
    // Services Offered
    "medicalSpecialty": services,
    
    // ENHANCED: Service Type Classification
    "serviceType": [
      "Home Health Care",
      "Home-Based Healthcare",
      "Medicare Home Health",
      "Post-Hospital Care"
    ],
    
    // ENHANCED: Individual Services as Service Objects
    "availableService": services.map(service => ({
      "@type": "Service",
      "name": service,
      "serviceType": "In-Home Care",
      "areaServed": {
        "@type": "City",
        "name": agency.city,
        ...(stateName && {
          "containedIn": {
            "@type": "State",
            "name": stateName
          }
        })
      }
    })),
    
    // Business Classification
    "knowsAbout": [
      "Home Health Care",
      "Medicare-Certified",
      "CMS-Accredited",
      "Medicare Home Health Services",
      "In-Home Healthcare",
      "Healthcare Services"
    ],
    "businessType": "Medicare-Certified Home Health Agency",
    ...(agency.ownership && { "ownership": agency.ownership }),
    
    // AUTHORITY CLUSTERING: Explicit Service Authority Memberships
    "expertise": getServiceAuthorityReferences(),
    ...(yearsInOperation > 0 && {
      "foundingDate": agency.certificationDate,
      "yearsInOperation": yearsInOperation
    }),
    
    // ENHANCED: Medicare Insurance Acceptance
    "acceptsHealthInsurance": [
      {
        "@type": "HealthInsurancePlan",
        "name": "Medicare",
        "insuranceProvider": {
          "@type": "Organization",
          "name": "Centers for Medicare & Medicaid Services",
          "url": "https://www.cms.gov"
        },
        "inNetwork": true
      }
    ],
    
    // ENHANCED: Regulatory Approval Badges
    "regulatoryApproval": [
      {
        "@type": "Certificate",
        "name": "CMS Medicare Home Health Certification",
        "issuedBy": {
          "@id": "urn:maf:entity:cms-authority"  // AUTHORITY CLUSTERING: CMS authority reference
        },
        "identifier": agency.ccn,
        ...(agency.certificationDate && {
          "validFrom": agency.certificationDate
        }),
        "scope": "Home Health Care Services",
        "accreditationCategory": "Medicare-Certified Provider"
      }
    ],
    
    // ENHANCED: Accreditation reference
    "accreditation": [
      {
        "@id": "urn:maf:entity:cms-authority"  // AUTHORITY CLUSTERING: CMS authority reference
      }
    ],
    
    // ENHANCED: Specializations
    "specialization": [
      "Post-Acute Care",
      "Hospital Discharge Planning",
      "Chronic Disease Management",
      "Rehabilitation Services",
      "Elderly Care",
      "Wound Care Management"
    ],
    
    // Certification Details
    "certifications": {
      "@type": "Certificate",
      "name": "Medicare Home Health Certification",
      "issuedBy": {
        "@id": "urn:maf:entity:cms-authority"  // AUTHORITY CLUSTERING: CMS authority reference
      },
      ...(agency.certificationDate && {
        "certificationDate": agency.certificationDate,
        "validFrom": agency.certificationDate
      })
    },
    
    // AUTHORITY CLUSTERING: State Membership
    ...(stateCode && {
      "memberOf": {
        "@id": `urn:maf:entity:${stateCode.toLowerCase()}-health-authority`
      }
    }),
    
    // AUTHORITY CLUSTERING: Ownership Classification
    ...(agency.ownership && {
      "organizationType": agency.ownership === "Proprietary" 
        ? { "@id": "urn:maf:entity:proprietary-ownership-authority" }
        : { "@id": "urn:maf:entity:nonprofit-ownership-authority" }
    }),

    // Parent Organization (CMS)
    "parentOrganization": {
      "@id": "urn:maf:entity:cms-authority"  // AUTHORITY CLUSTERING: CMS authority reference
    },
    
    // Quality Rating
    ...(agency.qualityRating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(agency.qualityRating),
        "bestRating": "5",
        "worstRating": "1",
        "ratingCount": 1,
        "ratedBy": {
          "@type": "Organization",
          "name": "Centers for Medicare & Medicaid Services"
        }
      }
    }),
    
    // ENHANCED: Directory Reference
    "listedIn": {
      "@type": "WebApplication",
      "name": "Medicare Agency Finder",
      "description": `The most comprehensive directory of ${TOTAL_AGENCIES_DISPLAY} Medicare-certified home health agencies`,
      "url": "https://medicareagencyfinder.com",
      "applicationCategory": "Healthcare",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    
    // Authority & Verification
    "sameAs": [
      "https://data.cms.gov/provider-data/dataset/6jpm-sxkc"
    ],
    "url": `https://medicareagencyfinder.com/state/${(stateCode || agency.state || '').toLowerCase()}/`
  };
}

/**
 * Alternative version that only returns critical fields
 * Used for itemListElement within ItemLists
 */
export function getAgencyListItemSchema(
  agency: Agency,
  stateCode?: string,
  stateName?: string
) {
  return getMedicalBusinessSchema(agency, stateCode, stateName);
}
