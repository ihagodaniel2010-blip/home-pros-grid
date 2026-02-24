import {
  Hammer, Droplets, Home,
  Snowflake, Sparkles, Layers, Zap, Wrench,
  Warehouse, Flame, Paintbrush, Square,
  Building, Plug, Lightbulb,
  type LucideIcon,
} from "lucide-react";

export interface Service {
  name: string;
  slug: string;
  icon: LucideIcon;
  category: "top" | "core" | "extended";
}

export interface SubServiceOption {
  label: string;
  subtypes?: string[];
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const allServices: Service[] = [
  // Top
  { name: "Carpentry", slug: "carpentry", icon: Hammer, category: "top" },
  { name: "Plumbing", slug: "plumbing", icon: Droplets, category: "top" },
  { name: "Remodeling", slug: "remodeling", icon: Home, category: "top" },
  { name: "Roofing", slug: "roofing", icon: Building, category: "top" },
  { name: "Cleaning", slug: "cleaning", icon: Sparkles, category: "top" },
  // Core
  { name: "Air Conditioning", slug: "air-conditioning", icon: Snowflake, category: "core" },
  { name: "Drywall", slug: "drywall", icon: Layers, category: "core" },
  { name: "Electrician", slug: "electrician", icon: Zap, category: "core" },
  { name: "Fencing", slug: "fencing", icon: Warehouse, category: "core" },
  { name: "Flooring", slug: "flooring", icon: Layers, category: "core" },
  { name: "Garage Door Installation", slug: "garage-door-installation", icon: Warehouse, category: "core" },
  { name: "Garage Door Repair", slug: "garage-door-repair", icon: Wrench, category: "core" },
  { name: "Handyman", slug: "handyman", icon: Wrench, category: "core" },
  { name: "Painting", slug: "painting", icon: Paintbrush, category: "core" },
  { name: "Tile", slug: "tile", icon: Square, category: "core" },
  // Extended
  { name: "Windows & Doors", slug: "windows-doors", icon: Home, category: "extended" },
  { name: "Kitchen Remodel", slug: "kitchen-remodel", icon: Home, category: "extended" },
  { name: "Bathroom Remodel", slug: "bathroom-remodel", icon: Droplets, category: "extended" },
  { name: "Basement Remodel", slug: "basement-remodel", icon: Home, category: "extended" },
  { name: "Siding", slug: "siding", icon: Building, category: "extended" },
  { name: "Appliance Repair", slug: "appliance-repair", icon: Wrench, category: "extended" },
  { name: "Water Heater", slug: "water-heater", icon: Flame, category: "extended" },
  { name: "Drain Cleaning", slug: "drain-cleaning", icon: Droplets, category: "extended" },
  { name: "Sewer / Septic", slug: "sewer-septic", icon: Wrench, category: "extended" },
  { name: "Lighting Installation", slug: "lighting-installation", icon: Lightbulb, category: "extended" },
  { name: "EV Charger Installation", slug: "ev-charger-installation", icon: Plug, category: "extended" },
  { name: "Deck / Porch", slug: "deck-porch", icon: Hammer, category: "extended" },
];

export const topServices = allServices.filter((s) => s.category === "top");

export const coreServices: Service[] = [
  ...allServices.filter((s) => s.category === "top"),
  ...allServices.filter(
    (s) => s.category === "core" && !allServices.some((t) => t.category === "top" && t.slug === s.slug)
  ),
].slice(0, 20);

export const getServiceBySlug = (slug: string): Service | undefined =>
  allServices.find((s) => s.slug === slug);

export const subServiceMap: Record<string, SubServiceOption[]> = {
  carpentry: [
    { label: "Closets / Built-in furniture" },
    { label: "Finish Carpentry, Trim, Molding" },
    { label: "Doors - Install or Repair" },
    { label: "Decks / Porches / Ramps" },
    { label: "Wood Stairs and Railings - Install / Repair" },
    { label: "Cabinets / Drawers - Install / repair", subtypes: ["Cabinets - Install", "Cabinets - Repair"] },
    { label: "Framing" },
    { label: "Exterior Building, Sheds, Gazebos" },
    { label: "Other (please add detailed description)" },
  ],
  plumbing: [
    { label: "Leak Repair" },
    { label: "Faucet / Fixture Installation" },
    { label: "Toilet Repair / Install" },
    { label: "Water Heater (Install/Repair)", subtypes: ["Install", "Repair"] },
    { label: "Drain Cleaning" },
    { label: "Sewer Line / Main Line" },
    { label: "Bathroom Plumbing" },
    { label: "Kitchen Plumbing" },
    { label: "Other" },
  ],
  roofing: [
    { label: "Roof Repair" },
    { label: "Roof Replacement" },
    { label: "Leak Inspection" },
    { label: "Shingle Roofing" },
    { label: "Flat Roofing" },
    { label: "Skylight Install/Repair" },
    { label: "Other" },
  ],
  remodeling: [
    { label: "Full Kitchen Remodel" },
    { label: "Kitchen Partial Remodel" },
    { label: "Full Bathroom Remodel" },
    { label: "Bathroom Partial Remodel" },
    { label: "Basement Finishing" },
    { label: "Home Addition" },
    { label: "Flooring as part of remodel" },
    { label: "Painting as part of remodel" },
    { label: "Other" },
  ],
  cleaning: [
    { label: "Standard House Cleaning" },
    { label: "Deep Cleaning" },
    { label: "Move-in / Move-out" },
    { label: "Post Construction Cleaning" },
    { label: "Office Cleaning" },
    { label: "Other" },
  ],
  electrician: [
    { label: "Outlet / Switch" },
    { label: "Lighting Installation" },
    { label: "Panel Upgrade" },
    { label: "EV Charger Installation" },
    { label: "Ceiling Fan" },
    { label: "Troubleshooting" },
    { label: "Other" },
  ],
  flooring: [
    { label: "Hardwood" },
    { label: "Laminate" },
    { label: "Vinyl" },
    { label: "Tile Flooring" },
    { label: "Carpet" },
    { label: "Repair" },
    { label: "Other" },
  ],
  "garage-door-installation": [
    { label: "New Garage Door Install" },
    { label: "Opener Install" },
    { label: "Other" },
  ],
  "garage-door-repair": [
    { label: "Spring Repair" },
    { label: "Opener Repair" },
    { label: "Off-track Door" },
    { label: "Sensor Issues" },
    { label: "Other" },
  ],
  handyman: [
    { label: "General Repairs" },
    { label: "Mounting / TV" },
    { label: "Drywall Patch" },
    { label: "Small Carpentry" },
    { label: "Door/Lock" },
    { label: "Other" },
  ],
  tile: [
    { label: "Shower Tile" },
    { label: "Floor Tile" },
    { label: "Backsplash" },
    { label: "Repair / Regrout" },
    { label: "Other" },
  ],
  painting: [
    { label: "Interior Painting" },
    { label: "Exterior Painting" },
    { label: "Cabinets Painting" },
    { label: "Deck Stain" },
    { label: "Touch-ups" },
    { label: "Other" },
  ],
  fencing: [
    { label: "Wood Fence" },
    { label: "Vinyl Fence" },
    { label: "Chain Link" },
    { label: "Repair" },
    { label: "Gate Install/Repair" },
    { label: "Other" },
  ],
  drywall: [
    { label: "New Drywall Install" },
    { label: "Repair / Patch" },
    { label: "Ceiling Repair" },
    { label: "Texture / Finish" },
    { label: "Other" },
  ],
};

// Default subservices for services without specific mapping
export const getSubServices = (slug: string): SubServiceOption[] =>
  subServiceMap[slug] || [
    { label: "Installation" },
    { label: "Repair" },
    { label: "Maintenance" },
    { label: "Consultation" },
    { label: "Other" },
  ];
