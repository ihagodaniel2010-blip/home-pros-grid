import { supabase } from "@/lib/supabase";

export type SiteSettings = {
  businessName: string;
  contactEmail: string;
  contactPhone?: string;
  whatsapp?: string;
  businessAddress: string;
  mapsQuery: string;
  directionsUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  serviceAreas: string[];
  facebookUrl?: string;
  instagramUrl?: string;
};

export const defaultSiteSettings: SiteSettings = {
  businessName: "H & A Construction LLC",
  contactEmail: "info@h-a-construction.com",
  contactPhone: "978-398-2457",
  whatsapp: "",
  businessAddress: "Southern Maine",
  mapsQuery: "Southern Maine",
  directionsUrl: "",
  heroTitle: "Residential Construction & Remodeling in Southern Maine",
  heroSubtitle: "H & A Construction LLC provides professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding areas.",
  serviceAreas: [
    "Saco, ME",
    "Old Orchard Beach, ME",
    "Biddeford, ME",
    "Scarborough, ME",
    "Southern Maine"
  ],
};

export const fetchSiteSettingsPublic = async (): Promise<SiteSettings> => {
  if (!supabase) return defaultSiteSettings;

  try {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) throw error;

    const settings: Partial<SiteSettings> = {};
    data.forEach((row) => {
      if (row.key === "serviceAreas") {
        try {
          settings[row.key] = JSON.parse(row.value || "[]");
        } catch {
          settings[row.key] = [];
        }
      } else {
        (settings as any)[row.key] = row.value;
      }
    });

    return { ...defaultSiteSettings, ...settings };
  } catch (error) {
    console.warn("Failed to load site settings from Supabase", error);
    return defaultSiteSettings;
  }
};

export const fetchSiteSettingsAdmin = async (): Promise<SiteSettings> => {
  return fetchSiteSettingsPublic();
};

export const saveSiteSettingsAdmin = async (payload: SiteSettings): Promise<SiteSettings> => {
  if (!supabase) throw new Error("Supabase not configured");

  const rows = Object.entries(payload).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));

  const { error } = await supabase.from("site_settings").upsert(rows);
  if (error) throw error;

  return payload;
};
