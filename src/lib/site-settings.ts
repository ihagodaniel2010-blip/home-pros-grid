export type SiteSettings = {
  contactEmail: string;
  businessAddress: string;
  mapsQuery: string;
  directionsUrl?: string;
  serviceAreas: string[];
};

export const defaultSiteSettings: SiteSettings = {
  contactEmail: "contact@barrigudo.com",
  businessAddress: "Boston, Massachusetts",
  mapsQuery: "Boston Massachusetts",
  directionsUrl: "",
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
    "Boston",
  ],
};

const parseResponse = async (response: Response) => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
};

export const fetchSiteSettingsPublic = async (): Promise<SiteSettings> => {
  const response = await fetch("/api/site-settings");
  return parseResponse(response);
};

export const fetchSiteSettingsAdmin = async (): Promise<SiteSettings> => {
  const response = await fetch("/api/admin/site-settings", { credentials: "include" });
  return parseResponse(response);
};

export const saveSiteSettingsAdmin = async (payload: SiteSettings): Promise<SiteSettings> => {
  const response = await fetch("/api/admin/site-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};
