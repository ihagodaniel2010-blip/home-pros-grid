import { supabase } from './supabase';

export interface WebsiteSettings {
  id?: string;
  organization_id: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_image_url?: string | null;
  hero_mobile_image_url?: string | null;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  tiktok_enabled: boolean;
  youtube_enabled: boolean;
  company_phone: string;
  company_email: string;
  company_address: string;
  service_areas: string[];
  seo_title: string;
  seo_description: string;
}

export interface WebsiteCategory {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  display_order: number;
  is_published: boolean;
  show_on_homepage: boolean;
  created_at: string;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
  hero_headline: "Build a Better Home for What's Next.",
  hero_subheadline: "Remodeling, additions, and custom construction that add beauty, function, and value to your home.",
  hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80',
  hero_mobile_image_url: null,
  facebook_url: 'https://facebook.com/haconstructionllc',
  instagram_url: 'https://instagram.com/haconstructionllc',
  tiktok_url: 'https://tiktok.com/@haconstructionllc',
  youtube_url: 'https://youtube.com/@haconstructionllc',
  facebook_enabled: true,
  instagram_enabled: true,
  tiktok_enabled: true,
  youtube_enabled: true,
  company_phone: '(207) 555-0123',
  company_email: 'info@haconstructionllc.com',
  company_address: 'Southern Maine, USA',
  service_areas: ["Saco", "Biddeford", "Old Orchard Beach", "Scarborough", "Kennebunk", "Kennebunkport", "Arundel", "Portland", "Westbrook", "Wells"],
  seo_title: 'H & A Construction LLC | Southern Maine Contractor',
  seo_description: 'Quality residential construction, remodeling, roofing, siding, decks, and home improvements throughout Southern Maine.'
};

export const INITIAL_CATEGORIES: Omit<WebsiteCategory, 'id' | 'created_at'>[] = [
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Remodeling',
    slug: 'remodeling',
    description: 'Complete home transformations, interior modernization, and structural upgrades.',
    cover_image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    display_order: 1,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Kitchens',
    slug: 'kitchens',
    description: 'Custom kitchen design, cabinetry, countertops, and luxury finishes.',
    cover_image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    display_order: 2,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Bathrooms',
    slug: 'bathrooms',
    description: 'Custom tile showers, vanity installations, and complete bathroom remodels.',
    cover_image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    display_order: 3,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Decks',
    slug: 'decks',
    description: 'Custom outdoor composite & wood decking, railings, porches, and patios.',
    cover_image_url: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=800&q=80',
    display_order: 4,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Roofing',
    slug: 'roofing',
    description: 'Durable roof replacements, shingle repair, ice dam protection, and fascia work.',
    cover_image_url: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80',
    display_order: 5,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Siding',
    slug: 'siding',
    description: 'Vinyl, composite, and cedar siding installation with weatherproofing insulation.',
    cover_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    display_order: 6,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Flooring',
    slug: 'flooring',
    description: 'Hardwood, luxury vinyl plank (LVP), laminate, and custom tile installation.',
    cover_image_url: 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80',
    display_order: 7,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Drywall',
    slug: 'drywall',
    description: 'Precision sheetrock installation, taping, mudding, texture, and seamless repairs.',
    cover_image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    display_order: 8,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Finish Carpentry',
    slug: 'finish-carpentry',
    description: 'Custom trim work, crown molding, baseboards, built-ins, and interior doors.',
    cover_image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    display_order: 9,
    is_published: true,
    show_on_homepage: true,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Home Additions',
    slug: 'home-additions',
    description: 'Full home extensions, garage additions, sunrooms, and second-story expansions.',
    cover_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    display_order: 10,
    is_published: true,
    show_on_homepage: true,
  }
];

export async function fetchWebsiteSettings(orgId: string): Promise<WebsiteSettings> {
  if (!supabase) return DEFAULT_WEBSITE_SETTINGS;

  try {
    const { data, error } = await supabase
      .from('website_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_WEBSITE_SETTINGS;
    }

    return {
      ...data,
      service_areas: Array.isArray(data.service_areas_json) ? data.service_areas_json : DEFAULT_WEBSITE_SETTINGS.service_areas
    };
  } catch (err) {
    console.warn("Exception fetching website settings:", err);
    return DEFAULT_WEBSITE_SETTINGS;
  }
}

export async function saveWebsiteSettings(settings: Partial<WebsiteSettings> & { organization_id: string }): Promise<WebsiteSettings> {
  if (!supabase) throw new Error("Supabase is not initialized");

  const payload = {
    organization_id: settings.organization_id,
    hero_headline: settings.hero_headline ?? DEFAULT_WEBSITE_SETTINGS.hero_headline,
    hero_subheadline: settings.hero_subheadline ?? DEFAULT_WEBSITE_SETTINGS.hero_subheadline,
    hero_image_url: settings.hero_image_url || null,
    hero_mobile_image_url: settings.hero_mobile_image_url || null,
    facebook_url: settings.facebook_url ?? DEFAULT_WEBSITE_SETTINGS.facebook_url,
    instagram_url: settings.instagram_url ?? DEFAULT_WEBSITE_SETTINGS.instagram_url,
    tiktok_url: settings.tiktok_url ?? DEFAULT_WEBSITE_SETTINGS.tiktok_url,
    youtube_url: settings.youtube_url ?? DEFAULT_WEBSITE_SETTINGS.youtube_url,
    facebook_enabled: settings.facebook_enabled ?? true,
    instagram_enabled: settings.instagram_enabled ?? true,
    tiktok_enabled: settings.tiktok_enabled ?? true,
    youtube_enabled: settings.youtube_enabled ?? true,
    company_phone: settings.company_phone ?? DEFAULT_WEBSITE_SETTINGS.company_phone,
    company_email: settings.company_email ?? DEFAULT_WEBSITE_SETTINGS.company_email,
    company_address: settings.company_address ?? DEFAULT_WEBSITE_SETTINGS.company_address,
    service_areas_json: settings.service_areas ?? DEFAULT_WEBSITE_SETTINGS.service_areas,
    seo_title: settings.seo_title ?? DEFAULT_WEBSITE_SETTINGS.seo_title,
    seo_description: settings.seo_description ?? DEFAULT_WEBSITE_SETTINGS.seo_description,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('website_settings')
    .upsert(payload, { onConflict: 'organization_id' })
    .select()
    .single();

  if (error) {
    console.error("Error saving website settings:", error);
    throw error;
  }

  return {
    ...data,
    service_areas: Array.isArray(data.service_areas_json) ? data.service_areas_json : DEFAULT_WEBSITE_SETTINGS.service_areas
  };
}

export async function fetchWebsiteCategories(orgId: string): Promise<WebsiteCategory[]> {
  if (!supabase) {
    return INITIAL_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      ...c,
      created_at: new Date().toISOString()
    }));
  }

  try {
    const { data, error } = await supabase
      .from('website_categories')
      .select('*')
      .eq('organization_id', orgId)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return INITIAL_CATEGORIES.map((c, i) => ({
        id: `default-${i}`,
        ...c,
        created_at: new Date().toISOString()
      }));
    }

    return data as WebsiteCategory[];
  } catch (err) {
    console.warn("Exception fetching website categories:", err);
    return INITIAL_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      ...c,
      created_at: new Date().toISOString()
    }));
  }
}

export async function upsertWebsiteCategory(category: Partial<WebsiteCategory> & { organization_id: string; name: string }): Promise<WebsiteCategory> {
  if (!supabase) throw new Error("Supabase is not initialized");

  const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const payload = {
    ...(category.id ? { id: category.id } : {}),
    organization_id: category.organization_id,
    name: category.name,
    slug,
    description: category.description || null,
    cover_image_url: category.cover_image_url || null,
    seo_title: category.seo_title || null,
    seo_description: category.seo_description || null,
    display_order: category.display_order ?? 0,
    is_published: category.is_published ?? true,
    show_on_homepage: category.show_on_homepage ?? true,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('website_categories')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error upserting website category:", error);
    throw error;
  }

  return data as WebsiteCategory;
}

export async function deleteWebsiteCategory(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('website_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting website category:", error);
    throw error;
  }
}
