-- =============================================================================
-- MIGRATION 027: WEBSITE CMS, CATEGORIES, PORTFOLIO & SOCIAL MEDIA SETTINGS
-- H & A Construction LLC — Institutional Website & CMS Architecture
-- =============================================================================

-- 1. WEBSITE SETTINGS TABLE (Single-tenant / Multi-tenant CMS Config)
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    hero_headline TEXT NOT NULL DEFAULT 'Build a Better Home for What''s Next.',
    hero_subheadline TEXT NOT NULL DEFAULT 'Remodeling, additions, and custom construction that add beauty, function, and value to your home.',
    hero_image_url TEXT,
    hero_mobile_image_url TEXT,
    facebook_url TEXT NOT NULL DEFAULT 'https://facebook.com',
    instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com',
    tiktok_url TEXT NOT NULL DEFAULT 'https://tiktok.com',
    youtube_url TEXT NOT NULL DEFAULT 'https://youtube.com',
    facebook_enabled BOOLEAN NOT NULL DEFAULT true,
    instagram_enabled BOOLEAN NOT NULL DEFAULT true,
    tiktok_enabled BOOLEAN NOT NULL DEFAULT true,
    youtube_enabled BOOLEAN NOT NULL DEFAULT true,
    company_phone TEXT NOT NULL DEFAULT '(207) 555-0123',
    company_email TEXT NOT NULL DEFAULT 'info@haconstructionllc.com',
    company_address TEXT NOT NULL DEFAULT 'Southern Maine, USA',
    service_areas_json JSONB NOT NULL DEFAULT '["Saco", "Biddeford", "Old Orchard Beach", "Scarborough", "Kennebunk", "Kennebunkport", "Arundel", "Portland", "Westbrook", "Wells"]'::jsonb,
    seo_title TEXT NOT NULL DEFAULT 'H & A Construction LLC | Southern Maine Contractor',
    seo_description TEXT NOT NULL DEFAULT 'Quality residential construction, remodeling, roofing, siding, decks, and home improvements throughout Southern Maine.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DYNAMIC SERVICE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.website_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    seo_title TEXT,
    seo_description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    show_on_homepage BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_website_categories_org_slug UNIQUE (organization_id, slug)
);

-- Index for category lookup
CREATE INDEX IF NOT EXISTS idx_website_categories_slug ON public.website_categories(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_website_categories_published ON public.website_categories(is_published, display_order);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_categories ENABLE ROW LEVEL SECURITY;

-- Website Settings: Public READ
CREATE POLICY "Public website settings read"
ON public.website_settings FOR SELECT
USING (true);

-- Website Settings: Managers Write
CREATE POLICY "Managers website settings write"
ON public.website_settings FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- Website Categories: Public Read Published Only
CREATE POLICY "Public website categories read"
ON public.website_categories FOR SELECT
USING (is_published = true OR public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- Website Categories: Managers Write
CREATE POLICY "Managers website categories write"
ON public.website_categories FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- 4. SEED INITIAL DEFAULT CATEGORIES FOR H&A CONSTRUCTION
INSERT INTO public.website_categories (organization_id, name, slug, description, cover_image_url, display_order, is_published, show_on_homepage)
VALUES
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Remodeling', 'remodeling', 'Complete home transformations, interior modernization, and structural upgrades.', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', 1, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Kitchens', 'kitchens', 'Custom kitchen design, cabinetry, countertops, and luxury finishes.', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', 2, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Bathrooms', 'bathrooms', 'Custom tile showers, vanity installations, and complete bathroom remodels.', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', 3, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Decks', 'decks', 'Custom outdoor composite & wood decking, railings, porches, and patios.', 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=800&q=80', 4, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Roofing', 'roofing', 'Durable roof replacements, shingle repair, ice dam protection, and fascia work.', 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80', 5, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Siding', 'siding', 'Vinyl, composite, and cedar siding installation with weatherproofing insulation.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', 6, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Flooring', 'flooring', 'Hardwood, luxury vinyl plank (LVP), laminate, and custom tile installation.', 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80', 7, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Drywall', 'drywall', 'Precision sheetrock installation, taping, mudding, texture, and seamless repairs.', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', 8, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Finish Carpentry', 'finish-carpentry', 'Custom trim work, crown molding, baseboards, built-ins, and interior doors.', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', 9, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Home Additions', 'home-additions', 'Full home extensions, garage additions, sunrooms, and second-story expansions.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', 10, true, true)
ON CONFLICT (organization_id, slug) DO NOTHING;
