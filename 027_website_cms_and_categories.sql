-- =============================================================================
-- MIGRATION 027: WEBSITE CMS, CATEGORIES, PORTFOLIO & SOCIAL MEDIA SETTINGS
-- H & A Construction LLC — Institutional Website & CMS Architecture
-- =============================================================================

-- 1. WEBSITE SETTINGS TABLE (CMS Config, Hero, Social Media, Contact Info)
CREATE TABLE IF NOT EXISTS public.website_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE,
    hero_headline TEXT NOT NULL DEFAULT 'Build a Better Home for What''s Next.',
    hero_subheadline TEXT NOT NULL DEFAULT 'Remodeling, additions, and custom construction that add beauty, function, and value to your home.',
    hero_image_url TEXT,
    hero_mobile_image_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    youtube_url TEXT,
    facebook_enabled BOOLEAN NOT NULL DEFAULT false,
    instagram_enabled BOOLEAN NOT NULL DEFAULT false,
    tiktok_enabled BOOLEAN NOT NULL DEFAULT false,
    youtube_enabled BOOLEAN NOT NULL DEFAULT false,
    company_phone TEXT,
    company_email TEXT,
    company_address TEXT,
    service_areas_json JSONB NOT NULL DEFAULT '["Saco", "Biddeford", "Old Orchard Beach", "Scarborough", "Kennebunk", "Kennebunkport", "Arundel", "Portland", "Westbrook", "Wells"]'::jsonb,
    seo_title TEXT NOT NULL DEFAULT 'H & A Construction LLC | Southern Maine Contractor',
    seo_description TEXT NOT NULL DEFAULT 'Quality residential construction, remodeling, roofing, siding, decks, and home improvements throughout Southern Maine.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. DYNAMIC SERVICE CATEGORIES TABLE (Default is_published = false for new draft categories)
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
    is_published BOOLEAN NOT NULL DEFAULT false,
    show_on_homepage BOOLEAN NOT NULL DEFAULT true,
    show_in_services_menu BOOLEAN NOT NULL DEFAULT true,
    show_in_projects_gallery BOOLEAN NOT NULL DEFAULT true,
    has_individual_page BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_website_categories_org_slug UNIQUE (organization_id, slug)
);

-- Indexes for category lookup
CREATE INDEX IF NOT EXISTS idx_website_categories_slug ON public.website_categories(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_website_categories_published ON public.website_categories(is_published, is_archived, display_order);

-- 3. MEDIA & CATEGORY JUNCTION TABLE (Allows 1 photo to belong to multiple categories)
CREATE TABLE IF NOT EXISTS public.media_category_relations (
    media_id UUID NOT NULL REFERENCES public.service_job_media(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.website_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (media_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_media_cat_media_id ON public.media_category_relations(media_id);
CREATE INDEX IF NOT EXISTS idx_media_cat_category_id ON public.media_category_relations(category_id);

-- 4. PROJECT & CATEGORY JUNCTION TABLE (Allows 1 project to belong to multiple categories)
CREATE TABLE IF NOT EXISTS public.project_category_relations (
    job_id UUID NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.website_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (job_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_project_cat_job_id ON public.project_category_relations(job_id);
CREATE INDEX IF NOT EXISTS idx_project_cat_category_id ON public.project_category_relations(category_id);

-- 5. EXTEND SERVICE JOB MEDIA TABLE FOR CMS ENHANCEMENTS
ALTER TABLE public.service_job_media
ADD COLUMN IF NOT EXISTS is_featured_homepage BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 6. EXTEND SERVICE JOBS TABLE FOR PORTFOLIO ENHANCEMENTS
ALTER TABLE public.service_jobs
ADD COLUMN IF NOT EXISTS is_featured_homepage BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS portfolio_cover_media_id UUID,
ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES WITH CROSS-ORG ISOLATION & TIGHT PUBLIC READ
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_category_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_category_relations ENABLE ROW LEVEL SECURITY;

-- Website Settings Policies
DROP POLICY IF EXISTS "Public website settings read" ON public.website_settings;
CREATE POLICY "Public website settings read"
ON public.website_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Managers website settings write" ON public.website_settings;
CREATE POLICY "Managers website settings write"
ON public.website_settings FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- Website Categories Policies
DROP POLICY IF EXISTS "Public website categories read" ON public.website_categories;
CREATE POLICY "Public website categories read"
ON public.website_categories FOR SELECT
USING (
    (is_published = true AND is_archived = false) 
    OR public.get_user_role_in_org(organization_id) IN ('owner', 'admin')
);

DROP POLICY IF EXISTS "Managers website categories write" ON public.website_categories;
CREATE POLICY "Managers website categories write"
ON public.website_categories FOR ALL
USING (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'))
WITH CHECK (public.get_user_role_in_org(organization_id) IN ('owner', 'admin'));

-- Media Category Relations Policies (Strict Public READ & Same-Organization WRITE validation)
DROP POLICY IF EXISTS "Public media category relations read" ON public.media_category_relations;
CREATE POLICY "Public media category relations read"
ON public.media_category_relations FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM public.service_job_media m
        JOIN public.website_categories c ON c.id = media_category_relations.category_id
        WHERE m.id = media_category_relations.media_id
          AND m.visible_on_public_site = true 
          AND m.portfolio_approved = true
          AND c.is_published = true 
          AND c.is_archived = false
    )
    OR EXISTS (
        SELECT 1 FROM public.service_job_media m
        WHERE m.id = media_category_relations.media_id
        AND public.get_user_role_in_org(m.organization_id) IN ('owner', 'admin')
    )
);

DROP POLICY IF EXISTS "Managers media category relations write" ON public.media_category_relations;
CREATE POLICY "Managers media category relations write"
ON public.media_category_relations FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.service_job_media m
        JOIN public.website_categories c ON c.id = media_category_relations.category_id
        WHERE m.id = media_category_relations.media_id
          AND m.organization_id = c.organization_id
          AND public.get_user_role_in_org(m.organization_id) IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.service_job_media m
        JOIN public.website_categories c ON c.id = media_category_relations.category_id
        WHERE m.id = media_category_relations.media_id
          AND m.organization_id = c.organization_id
          AND public.get_user_role_in_org(m.organization_id) IN ('owner', 'admin')
    )
);

-- Project Category Relations Policies (Strict Public READ & Same-Organization WRITE validation)
DROP POLICY IF EXISTS "Public project category relations read" ON public.project_category_relations;
CREATE POLICY "Public project category relations read"
ON public.project_category_relations FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM public.service_jobs j
        JOIN public.website_categories c ON c.id = project_category_relations.category_id
        WHERE j.id = project_category_relations.job_id
          AND j.organization_id = c.organization_id
          AND c.is_published = true 
          AND c.is_archived = false
          AND EXISTS (
              SELECT 1 FROM public.service_job_media m
              WHERE m.service_job_id = j.id
                AND m.organization_id = j.organization_id
                AND m.visible_on_public_site = true
                AND m.portfolio_approved = true
          )
    )
    OR EXISTS (
        SELECT 1 FROM public.service_jobs j
        WHERE j.id = project_category_relations.job_id
        AND public.get_user_role_in_org(j.organization_id) IN ('owner', 'admin')
    )
);

DROP POLICY IF EXISTS "Managers project category relations write" ON public.project_category_relations;
CREATE POLICY "Managers project category relations write"
ON public.project_category_relations FOR ALL
USING (
    EXISTS (
        SELECT 1 
        FROM public.service_jobs j
        JOIN public.website_categories c ON c.id = project_category_relations.category_id
        WHERE j.id = project_category_relations.job_id
          AND j.organization_id = c.organization_id
          AND public.get_user_role_in_org(j.organization_id) IN ('owner', 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM public.service_jobs j
        JOIN public.website_categories c ON c.id = project_category_relations.category_id
        WHERE j.id = project_category_relations.job_id
          AND j.organization_id = c.organization_id
          AND public.get_user_role_in_org(j.organization_id) IN ('owner', 'admin')
    )
);

-- 8. GRANT ACCESS PERMISSIONS
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT ALL ON public.website_settings TO authenticated, service_role;

GRANT SELECT ON public.website_categories TO anon, authenticated;
GRANT ALL ON public.website_categories TO authenticated, service_role;

GRANT SELECT ON public.media_category_relations TO anon, authenticated;
GRANT ALL ON public.media_category_relations TO authenticated, service_role;

GRANT SELECT ON public.project_category_relations TO anon, authenticated;
GRANT ALL ON public.project_category_relations TO authenticated, service_role;

-- 9. SEED INITIAL 14 DEFAULT CATEGORIES (DO NOTHING ON CONFLICT TO PRESERVE ADMIN CUSTOMIZATIONS)
INSERT INTO public.website_categories 
(organization_id, name, slug, description, cover_image_url, display_order, is_published, show_on_homepage, show_in_services_menu, show_in_projects_gallery, has_individual_page)
VALUES
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Remodeling', 'remodeling', 'Complete home transformations, interior modernization, and structural upgrades.', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', 1, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Framing', 'framing', 'Precision residential timber framing, load-bearing wall modifications, and structural wall framing.', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', 2, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Drywall', 'drywall', 'Precision sheetrock installation, taping, mudding, texture, and seamless wall repairs.', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', 3, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Roofing', 'roofing', 'Durable roof replacements, architectural shingles, ice dam prevention, and fascia work.', 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80', 4, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Siding', 'siding', 'Vinyl, composite, and cedar siding installation with weatherproofing and exterior trim.', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', 5, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Decks', 'decks', 'Custom outdoor composite & timber decking, railings, covered porches, and outdoor living spaces.', 'https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=800&q=80', 6, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Flooring', 'flooring', 'Hardwood, luxury vinyl plank (LVP), laminate, and custom tile installation.', 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?auto=format&fit=crop&w=800&q=80', 7, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Finish Carpentry', 'finish-carpentry', 'Custom trim work, crown molding, baseboards, built-in shelving, and interior doors.', 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', 8, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Kitchens', 'kitchens', 'Custom kitchen design, cabinetry, quartz/granite countertops, lighting, and luxury finishes.', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80', 9, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Bathrooms', 'bathrooms', 'Custom walk-in tile showers, vanity installations, plumbing fixtures, and complete bathroom remodels.', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', 10, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Home Additions', 'home-additions', 'Full house extensions, garage builds, sunrooms, master suite additions, and second-story expansions.', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80', 11, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Painting', 'painting', 'Interior & exterior professional painting, wall prep, trim painting, and surface protection.', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80', 12, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'Doors & Windows', 'doors-windows', 'Energy-efficient replacement window installation, exterior entry doors, patio sliders, and interior doors.', 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80', 13, true, true, true, true, true),
('45689bbf-193b-4ae8-82f4-e32bbe63b6dd', 'General Repairs', 'general-repairs', 'Home maintenance, structural fixes, rot replacement, siding patching, and general contractor repairs.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 14, true, true, true, true, true)
ON CONFLICT (organization_id, slug) DO NOTHING;


