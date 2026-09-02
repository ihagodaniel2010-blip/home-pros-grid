/**
 * Centralized site configuration for H & A Construction LLC
 */

export const siteConfig = {
  // Business Information
  businessName: "H & A Construction LLC",
  businessTagline: "Professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Southern Maine.",
  
  // Contact Information
  contactEmail: "info@h-a-construction.com",
  primaryPhone: "978-398-2457",
  secondaryPhone: "978-325-7324",
  phones: ["978-398-2457", "978-325-7324"],
  
  // Primary Service Areas (Southern Maine)
  serviceAreas: [
    "Saco, ME",
    "Old Orchard Beach, ME",
    "Biddeford, ME",
    "Scarborough, ME"
  ],
  serviceAreasPlus: "And surrounding areas in Southern Maine",
  
  // Business Region
  businessAddress: "Southern Maine",
  businessRegion: "Southern Maine",
  
  // Navigation CTA destinations
  ctaGetQuote: "/#estimate-form",
  
  // Google Reviews URL (Set NEXT_PUBLIC_GOOGLE_REVIEWS_URL in environment)
  googleReviewsUrl: typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL || "") : "",

  // Canonical Domain
  canonicalUrl: "https://www.h-a-construction.com/",
  
  // Styling Tokens
  borderRadius: {
    lg: "xl",
    md: "lg",
  },
  shadows: {
    sm: "0 2px 8px rgba(15,46,77,0.12)",
    md: "0 4px 16px rgba(15,46,77,0.15)",
  },
  colors: {
    primary: "var(--primary, #0b6dbf)",
    background: "var(--background)",
    foreground: "var(--foreground)",
  },
};

export const getContactEmailLink = (email: string = siteConfig.contactEmail): string => {
  return `mailto:${email}`;
};

export const getPrimaryPhoneLink = (): string => {
  return `tel:${siteConfig.primaryPhone.replace(/[^0-9]/g, '')}`;
};

export const getSecondaryPhoneLink = (): string => {
  return `tel:${siteConfig.secondaryPhone.replace(/[^0-9]/g, '')}`;
};
