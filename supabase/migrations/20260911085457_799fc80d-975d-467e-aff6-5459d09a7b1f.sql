-- Security fix: restrict raw campaign_reports table access to owners/admins/assigned users.
-- Public (anon) access to published reports goes through the public_campaign_reports view,
-- which excludes client_email and brand_email.

-- Drop the broad "Anyone can view published reports" policy on the raw table.
DROP POLICY IF EXISTS "Anyone can view published reports" ON public.campaign_reports;

-- Revoke any remaining table-level SELECT granted to anon/authenticated (safety net).
REVOKE SELECT ON public.campaign_reports FROM anon, authenticated;

-- Keep column-level SELECT only for the public-safe columns (excluding client_email/brand_email).
GRANT SELECT (id, owner_id, title, description, slug, published, published_at, header_image_url, source_roster_id, created_at, updated_at, categories, hide_categories, template, access_code, access_code_label, profile_image_url) ON public.campaign_reports TO anon, authenticated;

-- Ensure the public view is accessible (it already exists and excludes sensitive emails).
GRANT SELECT ON public.public_campaign_reports TO anon, authenticated;