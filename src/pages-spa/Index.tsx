import React from "react";
import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import DirectEstimateForm from "@/components/DirectEstimateForm";
import ArticlesSection from "@/components/ArticlesSection";
import { siteConfig } from "@/config/site";

const Index = () => {
  const jsonLdData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.canonicalUrl}#website`,
        "url": siteConfig.canonicalUrl,
        "name": siteConfig.businessName,
        "description": siteConfig.businessTagline,
        "inLanguage": "en-US"
      },
      {
        "@type": "Organization",
        "@id": `${siteConfig.canonicalUrl}#organization`,
        "name": siteConfig.businessName,
        "url": siteConfig.canonicalUrl,
        "telephone": siteConfig.phones[0],
        "email": siteConfig.contactEmail,
        "areaServed": siteConfig.serviceAreas
      },
      {
        "@type": "HomeAndConstructionBusiness",
        "@id": `${siteConfig.canonicalUrl}#localbusiness`,
        "name": siteConfig.businessName,
        "url": siteConfig.canonicalUrl,
        "telephone": siteConfig.phones[0],
        "email": siteConfig.contactEmail,
        "priceRange": "$$",
        "areaServed": [
          { "@type": "City", "name": "Saco", "addressRegion": "ME" },
          { "@type": "City", "name": "Old Orchard Beach", "addressRegion": "ME" },
          { "@type": "City", "name": "Biddeford", "addressRegion": "ME" },
          { "@type": "City", "name": "Scarborough", "addressRegion": "ME" },
          { "@type": "AdministrativeArea", "name": "Southern Maine" }
        ],
        "knowsAbout": [
          "Residential Construction",
          "Remodeling & Renovation",
          "Roofing Repair & Replacement",
          "Flooring Installation",
          "Painting & Drywall",
          "Carpentry & Finish Work"
        ]
      }
    ]
  };

  return (
    <Layout>
      {/* JSON-LD Structured Data for Local SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
      />

      {/* Hero Section */}
      <HeroSection />

      {/* Direct Estimate Request Form */}
      <DirectEstimateForm />

      {/* Main Content Showcase, Google Reviews & Service Areas */}
      <ArticlesSection />
    </Layout>
  );
};

export default Index;
