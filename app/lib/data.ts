import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Eye,
  FileCheck,
  Lock,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

export const navLinks = [
  { label: "Clinicians", href: "/clinicians" },
  { label: "Product", href: "/#product" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "For Clinicians", href: "/#for-clinicians" },
  { label: "For Employers", href: "/#for-employers" },
  { label: "Pricing", href: "/#pricing" },
] as const;

export const partnerBadges = [
  "Major Health System",
  "Regional Hospital Network",
  "National Rehab Group",
  "Community Care Alliance",
  "Metro Clinic Partners",
  "Integrated Health Co.",
] as const;

export interface ProblemSolutionItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const problemSolutionItems: ProblemSolutionItem[] = [
  {
    title: "The Problem",
    description:
      "Traditional recruiting takes 45+ days. Burnout is rising. Units run short.",
    icon: AlertTriangle,
  },
  {
    title: "The Platform",
    description:
      "One dashboard. Pre-verified, multi-state licensed clinicians. Instant matching.",
    icon: Zap,
  },
  {
    title: "The Outcome",
    description:
      "Fill shifts in hours, not weeks. Reduce agency spend. Stay compliant.",
    icon: ShieldCheck,
  },
];

export interface StepItem {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const howItWorksSteps: StepItem[] = [
  {
    step: 1,
    title: "Post a Role",
    description:
      "Define needs, shift types, and specialties in a single streamlined workflow.",
    icon: ClipboardList,
  },
  {
    step: 2,
    title: "Get Matched",
    description:
      "Our system surfaces verified candidates with active licenses and credentials.",
    icon: Users,
  },
  {
    step: 3,
    title: "Hire Confidently",
    description:
      "Interview, onboard, and schedule directly — with full compliance visibility.",
    icon: CheckCircle,
  },
];

export const employerFeatures = [
  "Nationwide License Verification",
  "Automated Credential Tracking",
  "Shift & Per-Diem Scheduling",
  "Direct Hire, No Agency Markups",
] as const;

export const clinicianFeatures = [
  "One Profile, Multi-State Opportunities",
  "License Management Reminders",
  "Transparent Pay & Shift Details",
  "Direct Connection to Employers",
] as const;

export interface StatItem {
  value: string;
  label: string;
}

export const stats: StatItem[] = [
  { value: "10,000+", label: "Verified Clinicians" },
  { value: "48-Hour", label: "Average Time-to-Hire" },
  { value: "500+", label: "Care Facilities" },
  { value: "50", label: "States Covered" },
];

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "We filled our ICU gaps in two days. OpusGrex replaced our reliance on expensive travel nurse agencies.",
    author: "Director of Nursing",
    role: "Midwest Health System",
  },
  {
    quote:
      "As a traveling PT, I finally have a platform that treats my license and credentials with respect.",
    author: "Sarah M., DPT",
    role: "Physical Therapist",
  },
  {
    quote:
      "Compliance loves the automated verification. Recruitment loves the speed.",
    author: "HR VP",
    role: "Regional Clinic Chain",
  },
];

export interface TrustItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const trustItems: TrustItem[] = [
  {
    title: "SOC 2 Type II Compliant Infrastructure",
    description:
      "Enterprise-grade security controls audited for availability, confidentiality, and processing integrity.",
    icon: Shield,
  },
  {
    title: "Automated License Verification",
    description:
      "Real-time validation through Nursys and state board integrations across all 50 states.",
    icon: FileCheck,
  },
  {
    title: "HIPAA-Aware Data Architecture",
    description:
      "Protected health information handled with encryption at rest and in transit.",
    icon: Lock,
  },
  {
    title: "Background Check & OIG Screening",
    description:
      "Comprehensive exclusion screening and background verification before any match.",
    icon: Eye,
  },
];

export interface PricingTier {
  name: string;
  description: string;
  price: string;
  features: string[];
  highlighted?: boolean;
  cta: string;
}

export const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    description: "For small practices getting started with direct hire.",
    price: "Free to post",
    features: [
      "Pay per successful hire",
      "Basic license verification",
      "Standard matching queue",
      "Email support",
    ],
    cta: "Get Started",
  },
  {
    name: "Professional",
    description: "For growing clinics that need speed and scale.",
    price: "$499/mo",
    features: [
      "Unlimited hires",
      "Priority matching",
      "Automated credential tracking",
      "Dedicated account manager",
    ],
    highlighted: true,
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    description: "For health systems with complex staffing needs.",
    price: "Custom",
    features: [
      "Custom contracts & SLAs",
      "API access (coming soon)",
      "Multi-facility dashboards",
      "24/7 priority support",
    ],
    cta: "Contact Sales",
  },
];

export const clinicianCards = [
  { role: "RN", badges: ["Verified License", "Background Cleared"] },
  { role: "PT", badges: ["Multi-State", "Credentialed"] },
  { role: "LPN", badges: ["Verified License", "Available Now"] },
] as const;

export const facilityCards = [
  { name: "ICU Unit", type: "Acute Care" },
  { name: "Rehab Clinic", type: "Outpatient" },
  { name: "Skilled Nursing", type: "Long-Term Care" },
] as const;

export const footerLinks = {
  product: [
    { label: "Clinicians", href: "/clinicians" },
    { label: "Features", href: "/#product" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Security", href: "/#security" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "HIPAA Notice", href: "#" },
  ],
} as const;
