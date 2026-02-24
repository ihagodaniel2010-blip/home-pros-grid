/**
 * Centralized site configuration
 * Update these values to quickly change business details across the site
 */

export const siteConfig = {
  // Business Information
  businessName: "Barrigudo",
  businessTagline: "We proudly serve these Massachusetts communities.",
  
  // Contact Information
  contactEmail: "info@barrigudo.com",
  contactPhone: undefined, // Set to null/undefined if not available
  
  // Service Areas (Massachusetts communities)
  serviceAreas: [
    "Wellesley",
    "Newton",
    "Burlington",
    "Billerica",
    "Arlington",
    "Belmont",
    "Lynnfield",
    "Somerville",
    "Peabody",
  ],
  serviceAreasPlus: "And surrounding communities throughout Greater Boston",
  
  // Business Address
  businessAddress: "Boston, Massachusetts",
  businessRegion: "Greater Boston Area",
  
  // Navigation CTA destinations
  ctaGetQuote: "/services", // "Get a Free Quote" button href
  
  // Maps Configuration
  // Using a place query (no API key needed for basic embed)
  googleMapsQuery: "Boston Massachusetts home services",
  googleMapsEmbedId: "boston-ma", // For custom styling if needed
  
  // Styling Tokens (reuse from your design system)
  borderRadius: {
    lg: "xl", // 20px
    md: "lg", // 12px
  },
  shadows: {
    sm: "0 2px 8px rgba(15,46,77,0.12)",
    md: "0 4px 16px rgba(15,46,77,0.15)",
  },
  colors: {
    primary: "var(--primary, #0b6dbf)", // Update if different
    background: "var(--background)",
    foreground: "var(--foreground)",
  },
};

/**
 * Helper function to create Google Maps embed URL
 * No API key needed for basic place embed
 */
export const getGoogleMapsEmbedUrl = (query: string = siteConfig.googleMapsQuery): string => {
  const encoded = encodeURIComponent(query);
  return `https://www.google.com/maps?q=${encoded}&output=embed`;
};

/**
 * Helper function to create Google Maps directions URL
 * Opens in Google Maps app or web
 */
export const getGoogleMapsDirectionsUrl = (destination: string = siteConfig.businessAddress): string => {
  const encoded = encodeURIComponent(destination);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
};

/**
 * Helper function to create mailto link
 */
export const getContactEmailLink = (email: string = siteConfig.contactEmail): string => {
  return `mailto:${email}`;
};
