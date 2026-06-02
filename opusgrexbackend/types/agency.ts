// Database schema types for Medicare Home Health Care Agencies

export interface Agency {
  id?: number;
  state: string;
  ccn: string; // CMS Certification Number
  providerName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  ownership: string;
  
  // Services offered (boolean flags)
  nursingCare: boolean;
  physicalTherapy: boolean;
  occupationalTherapy: boolean;
  speechPathology: boolean;
  medicalSocial: boolean;
  homeHealthAide: boolean;
  
  // Quality metrics
  qualityRating: number | null; // Star rating (1-5)
  certificationDate: string;
  
  // Geolocation (pre-computed from address)
  latitude?: number;
  longitude?: number;
  
  // Verification & Profile fields
  isVerified?: boolean; // Whether agency is verified
  verifiedAt?: string; // ISO timestamp
  verifiedEmail?: string; // Agency's verified email
  verifiedWebsite?: string; // Agency's verified website
  subscriptionStatus?: 'active' | 'cancelled' | 'past_due'; // Subscription status
  stripeCustomerId?: string; // Stripe customer ID for billing
  
  // Metadata
  lastUpdated: Date;
}

export interface StateAgencies {
  state: string;
  stateName: string;
  agencies: Agency[];
  count: number;
}

export interface AgencySubscription {
  id?: number;
  agencyId: number; // Foreign key to Agency
  stripeSubscriptionId: string; // Stripe subscription ID
  stripeCustomerId: string; // Stripe customer ID
  status: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  currentPeriodStart: string; // ISO timestamp
  currentPeriodEnd: string; // ISO timestamp
  cancelledAt?: string; // ISO timestamp if cancelled
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface VerificationRequest {
  ccn: string;
  email: string;
  website?: string;
  message?: string;
}

// US States and Territories mapping
export const US_STATES: { [key: string]: string } = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
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
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  // Territories
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "U.S. Virgin Islands",
  AS: "American Samoa",
};
