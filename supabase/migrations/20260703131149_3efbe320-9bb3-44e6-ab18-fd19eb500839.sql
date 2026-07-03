
-- Add scoped public SELECT policy for published rosters so the rosters table
-- exposure matches roster_items, and lock down sensitive email columns via
-- column-level privileges so they cannot leak through the new policy.

CREATE POLICY "Anyone can view published rosters"
ON public.rosters
FOR SELECT
TO anon, authenticated
USING (published = true AND slug IS NOT NULL);

CREATE POLICY "Owners can view own rosters"
ON public.rosters
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Ensure anon/authenticated can never read the sensitive email columns
-- directly. Owners/admins/assigned users access these via SECURITY DEFINER
-- helpers (get_roster_assignment, get_assigned_rosters).
REVOKE SELECT (client_email, brand_email) ON public.rosters FROM anon, authenticated;

GRANT SELECT (
  id, owner_id, title, slug, description, published, published_at,
  header_image_url, created_at, updated_at
) ON public.rosters TO anon, authenticated;
