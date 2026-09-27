import { supabase } from './supabase';
import { getCompanySettings } from './company-settings';

export interface WebsiteSettings {
  id?: string;
  organization_id: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_image_url?: string | null;
  hero_mobile_image_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  facebook_enabled: boolean;
  instagram_enabled: boolean;
  tiktok_enabled: boolean;
  youtube_enabled: boolean;
  company_phone?: string | null;
  company_email?: string | null;
  company_address?: string | null;
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
  show_in_services_menu?: boolean;
  show_in_projects_gallery?: boolean;
  has_individual_page?: boolean;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
  hero_headline: "Build a Better Home for What's Next.",
  hero_subheadline: "Remodeling, additions, and custom construction that add beauty, function, and value to your home.",
  hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1920&q=80',
  hero_mobile_image_url: null,
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  facebook_enabled: false,
  instagram_enabled: false,
  tiktok_enabled: false,
  youtube_enabled: false,
  company_phone: null,
  company_email: null,
  company_address: null,
  service_areas: ["Saco", "Biddeford", "Old Orchard Beach", "Scarborough", "Kennebunk", "Kennebunkport", "Arundel", "Portland", "Westbrook", "Wells"],
  seo_title: 'H & A Construction LLC | Southern Maine Contractor',
  seo_description: 'Quality residential construction, remodeling, roofing, siding, decks, and home improvements throughout Southern Maine.'
};

export const INITIAL_14_CATEGORIES: Omit<WebsiteCategory, 'id' | 'created_at'>[] = [
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Remodeling',
    slug: 'remodeling',
    description: 'Complete home transformations, interior modernization, and structural upgrades.',
    cover_image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    display_order: 1,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Framing',
    slug: 'framing',
    description: 'Precision residential timber framing, load-bearing wall modifications, and structural wall framing.',
    cover_image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    display_order: 2,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Drywall',
    slug: 'drywall',
    description: 'Precision sheetrock installation, taping, mudding, texture, and seamless wall repairs.',
    cover_image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    display_order: 3,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Roofing',
    slug: 'roofing',
    description: 'Durable roof replacements, architectural shingles, ice dam prevention, and fascia work.',
    cover_image_url: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80',
    display_order: 4,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Siding',
    slug: 'siding',
    description: 'Vinyl, composite, and cedar siding installation with weatherproofing and exterior trim.',
    cover_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    display_order: 5,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Decks',
    slug: 'decks',
    description: 'Custom outdoor composite & timber decking, railings, covered porches, and outdoor living spaces.',
    cover_image_url: 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=800&q=80',
    display_order: 6,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
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
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Finish Carpentry',
    slug: 'finish-carpentry',
    description: 'Custom trim work, crown molding, baseboards, built-in shelving, and interior doors.',
    cover_image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    display_order: 8,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Kitchens',
    slug: 'kitchens',
    description: 'Custom kitchen design, cabinetry, quartz/granite countertops, lighting, and luxury finishes.',
    cover_image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    display_order: 9,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Bathrooms',
    slug: 'bathrooms',
    description: 'Custom walk-in tile showers, vanity installations, plumbing fixtures, and complete bathroom remodels.',
    cover_image_url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    display_order: 10,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Home Additions',
    slug: 'home-additions',
    description: 'Full house extensions, garage builds, sunrooms, master suite additions, and second-story expansions.',
    cover_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    display_order: 11,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Painting',
    slug: 'painting',
    description: 'Interior & exterior professional painting, wall prep, trim painting, and surface protection.',
    cover_image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
    display_order: 12,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'Doors & Windows',
    slug: 'doors-windows',
    description: 'Energy-efficient replacement window installation, exterior entry doors, patio sliders, and interior doors.',
    cover_image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    display_order: 13,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  },
  {
    organization_id: '45689bbf-193b-4ae8-82f4-e32bbe63b6dd',
    name: 'General Repairs',
    slug: 'general-repairs',
    description: 'Home maintenance, structural fixes, rot replacement, siding patching, and general contractor repairs.',
    cover_image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    display_order: 14,
    is_published: true,
    show_on_homepage: true,
    show_in_services_menu: true,
    show_in_projects_gallery: true,
    has_individual_page: true,
    is_archived: false,
  }
];

export function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === '42P01' ||
    code === 'PGRST204' ||
    msg.includes('schema cache') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

export async function fetchWebsiteSettings(orgId: string): Promise<WebsiteSettings> {
  const companyProfile = await getCompanySettings(orgId).catch(() => null);

  const defaults: WebsiteSettings = {
    ...DEFAULT_WEBSITE_SETTINGS,
    organization_id: orgId,
    company_phone: companyProfile?.phone || null,
    company_email: companyProfile?.email || null,
    company_address: companyProfile?.address || null,
  };

  if (!supabase) return defaults;

  try {
    const { data, error } = await supabase
      .from('website_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) {
      return defaults;
    }

    let heroUrl = data.hero_image_url;
    let heroMobileUrl = data.hero_mobile_image_url;

    if (heroUrl) {
      const { resolveSignedMediaUrl } = await import('./job-media');
      const res = await resolveSignedMediaUrl(heroUrl).catch(() => null);
      if (res) heroUrl = res;
    }

    if (heroMobileUrl) {
      const { resolveSignedMediaUrl } = await import('./job-media');
      const res = await resolveSignedMediaUrl(heroMobileUrl).catch(() => null);
      if (res) heroMobileUrl = res;
    }

    return {
      ...data,
      hero_image_url: heroUrl,
      hero_mobile_image_url: heroMobileUrl,
      company_phone: data.company_phone || companyProfile?.phone || null,
      company_email: data.company_email || companyProfile?.email || null,
      company_address: data.company_address || companyProfile?.address || null,
      service_areas: Array.isArray(data.service_areas_json) ? data.service_areas_json : defaults.service_areas
    };
  } catch (err) {
    console.warn("Exception fetching website settings:", err);
    return defaults;
  }
}

export async function saveWebsiteSettings(settings: Partial<WebsiteSettings> & { organization_id: string }): Promise<WebsiteSettings> {
  if (!supabase) throw new Error("Supabase client is not initialized.");

  const payload = {
    organization_id: settings.organization_id,
    hero_headline: settings.hero_headline ?? DEFAULT_WEBSITE_SETTINGS.hero_headline,
    hero_subheadline: settings.hero_subheadline ?? DEFAULT_WEBSITE_SETTINGS.hero_subheadline,
    hero_image_url: settings.hero_image_url || null,
    hero_mobile_image_url: settings.hero_mobile_image_url || null,
    facebook_url: settings.facebook_url || null,
    instagram_url: settings.instagram_url || null,
    tiktok_url: settings.tiktok_url || null,
    youtube_url: settings.youtube_url || null,
    facebook_enabled: !!settings.facebook_enabled,
    instagram_enabled: !!settings.instagram_enabled,
    tiktok_enabled: !!settings.tiktok_enabled,
    youtube_enabled: !!settings.youtube_enabled,
    company_phone: settings.company_phone || null,
    company_email: settings.company_email || null,
    company_address: settings.company_address || null,
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
    if (isTableMissingError(error)) {
      throw new Error("Tabela 'public.website_settings' não encontrada no banco de dados. Por favor, execute o script SQL da migração 027 no Editor SQL do Supabase.");
    }
    console.error("Error saving website settings:", error);
    throw error;
  }

  return {
    ...data,
    service_areas: Array.isArray(data.service_areas_json) ? data.service_areas_json : DEFAULT_WEBSITE_SETTINGS.service_areas
  };
}

export async function fetchWebsiteCategories(orgId: string, includeArchived: boolean = false): Promise<WebsiteCategory[]> {
  const defaultList = INITIAL_14_CATEGORIES.map((c, i) => ({
    id: `default-${i}`,
    ...c,
    organization_id: orgId,
    created_at: new Date().toISOString()
  }));

  if (!supabase) return defaultList;

  try {
    let query = supabase
      .from('website_categories')
      .select('*')
      .eq('organization_id', orgId)
      .order('display_order', { ascending: true });

    if (!includeArchived) {
      query = query.or('is_archived.is.null,is_archived.eq.false');
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return defaultList;
    }

    const { resolveSignedMediaUrl } = await import('./job-media');
    const resolvedData = await Promise.all(
      data.map(async (cat: any) => {
        if (cat.cover_image_url) {
          const res = await resolveSignedMediaUrl(cat.cover_image_url).catch(() => null);
          if (res) return { ...cat, cover_image_url: res };
        }
        return cat;
      })
    );

    return resolvedData as WebsiteCategory[];
  } catch (err) {
    console.warn("Exception fetching website categories:", err);
    return defaultList;
  }
}

/**
 * Public website categories fetcher with single-source-of-truth from public.website_categories
 */
export async function fetchPublicWebsiteCategories(orgId: string = '45689bbf-193b-4ae8-82f4-e32bbe63b6dd'): Promise<WebsiteCategory[]> {
  const defaultPublished = INITIAL_14_CATEGORIES
    .filter(c => c.is_published && !c.is_archived)
    .map((c, i) => ({
      id: `default-public-${i}`,
      ...c,
      organization_id: orgId,
      created_at: new Date().toISOString()
    }));

  if (!supabase) return defaultPublished;

  try {
    const { data, error } = await supabase
      .from('website_categories')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_published', true)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return defaultPublished;
    }

    const { resolveSignedMediaUrl } = await import('./job-media');
    const resolvedData = await Promise.all(
      data.map(async (cat: any) => {
        let cover = cat.cover_image_url;
        if (cover) {
          const res = await resolveSignedMediaUrl(cover).catch(() => null);
          if (res) cover = res;
        }
        return {
          ...cat,
          cover_image_url: cover,
          show_on_homepage: cat.show_on_homepage ?? true,
          show_in_services_menu: cat.show_in_services_menu ?? true,
          show_in_projects_gallery: cat.show_in_projects_gallery ?? true,
          has_individual_page: cat.has_individual_page ?? true,
        };
      })
    );

    return resolvedData as WebsiteCategory[];
  } catch (err) {
    console.warn("Exception in fetchPublicWebsiteCategories:", err);
    return defaultPublished;
  }
}

export function getHomepageCategories(categories: WebsiteCategory[]): WebsiteCategory[] {
  return categories.filter(c => c.show_on_homepage !== false && c.is_published !== false);
}

export function getServicesMenuCategories(categories: WebsiteCategory[]): WebsiteCategory[] {
  return categories.filter(c => c.show_in_services_menu !== false && c.is_published !== false);
}

export function getProjectsGalleryCategories(categories: WebsiteCategory[]): WebsiteCategory[] {
  return categories.filter(c => c.show_in_projects_gallery !== false && c.is_published !== false);
}

export function getCategoryBySlug(categories: WebsiteCategory[], slug: string): WebsiteCategory | undefined {
  if (!slug) return undefined;
  const cleanSlug = slug.toLowerCase().trim();
  return categories.find(c => 
    c.slug.toLowerCase() === cleanSlug || 
    c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanSlug
  );
}

export async function upsertWebsiteCategory(category: Partial<WebsiteCategory> & { organization_id: string; name: string }): Promise<WebsiteCategory> {
  if (!supabase) throw new Error("Supabase is not initialized");

  const slug = category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const payload = {
    ...(category.id && !category.id.startsWith('default-') ? { id: category.id } : {}),
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
    show_in_services_menu: category.show_in_services_menu ?? true,
    show_in_projects_gallery: category.show_in_projects_gallery ?? true,
    has_individual_page: category.has_individual_page ?? true,
    is_archived: category.is_archived ?? false,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('website_categories')
    .upsert(payload, { onConflict: 'organization_id,slug' })
    .select()
    .single();

  if (error) {
    if (isTableMissingError(error)) {
      throw new Error("Tabela 'public.website_categories' não encontrada. Execute a migração 027 no Supabase.");
    }
    console.error("Error upserting website category:", error);
    throw error;
  }

  return data as WebsiteCategory;
}

export async function archiveWebsiteCategory(id: string, is_archived: boolean = true): Promise<void> {
  if (!supabase || id.startsWith('default-')) return;
  const { error } = await supabase
    .from('website_categories')
    .update({ is_archived, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error("Error archiving website category:", error);
    throw error;
  }
}

export async function deleteWebsiteCategory(id: string): Promise<void> {
  if (!supabase || id.startsWith('default-')) return;
  const { error } = await supabase
    .from('website_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error deleting website category:", error);
    throw error;
  }
}

export async function fetchMediaCategoryIds(mediaId: string): Promise<string[]> {
  if (!supabase || !mediaId) return [];
  try {
    const { data, error } = await supabase
      .from('media_category_relations')
      .select('category_id')
      .eq('media_id', mediaId);

    if (error || !data) return [];
    return data.map(r => r.category_id);
  } catch (e) {
    return [];
  }
}

export async function saveMediaCategoryIds(mediaId: string, categoryIds: string[]): Promise<void> {
  if (!supabase || !mediaId) return;
  try {
    await supabase.from('media_category_relations').delete().eq('media_id', mediaId);
    if (categoryIds.length > 0) {
      const rows = categoryIds.map(catId => ({
        media_id: mediaId,
        category_id: catId
      }));
      await supabase.from('media_category_relations').insert(rows);
    }
  } catch (e) {
    console.error("Error saving media category relations:", e);
  }
}

export async function fetchProjectCategoryIds(jobId: string): Promise<string[]> {
  if (!supabase || !jobId) return [];
  try {
    const { data, error } = await supabase
      .from('project_category_relations')
      .select('category_id')
      .eq('job_id', jobId);

    if (error || !data) return [];
    return data.map(r => r.category_id);
  } catch (e) {
    return [];
  }
}

export async function saveProjectCategoryIds(jobId: string, categoryIds: string[]): Promise<void> {
  if (!supabase || !jobId) return;
  try {
    await supabase.from('project_category_relations').delete().eq('job_id', jobId);
    if (categoryIds.length > 0) {
      const rows = categoryIds.map(catId => ({
        job_id: jobId,
        category_id: catId
      }));
      await supabase.from('project_category_relations').insert(rows);
    }
  } catch (e) {
    console.error("Error saving project category relations:", e);
  }
}

