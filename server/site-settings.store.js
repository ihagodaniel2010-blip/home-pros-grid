import fs from "fs/promises";
import path from "path";

const settingsPath = path.resolve(process.cwd(), "data", "site-settings.json");

const defaultSettings = {
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

const toText = (value) => String(value ?? "").trim();

const normalizeServiceAreas = (value) => {
  const list = Array.isArray(value) ? value.map((item) => toText(item)) : [];
  const next = [...list];
  while (next.length < 10) next.push("");
  return next.slice(0, 10);
};

const normalizeSettings = (payload = {}) => {
  return {
    contactEmail: toText(payload.contactEmail) || defaultSettings.contactEmail,
    businessAddress: toText(payload.businessAddress) || defaultSettings.businessAddress,
    mapsQuery: toText(payload.mapsQuery) || defaultSettings.mapsQuery,
    directionsUrl: toText(payload.directionsUrl),
    serviceAreas: normalizeServiceAreas(payload.serviceAreas || defaultSettings.serviceAreas),
  };
};

const readSiteSettings = async () => {
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch (error) {
    if (error.code === "ENOENT") {
      const seeded = normalizeSettings(defaultSettings);
      await writeSiteSettings(seeded);
      return seeded;
    }
    throw error;
  }
};

const writeSiteSettings = async (payload) => {
  const next = normalizeSettings(payload);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  const tempPath = `${settingsPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tempPath, settingsPath);
  return next;
};

export { readSiteSettings, writeSiteSettings, defaultSettings };
