CREATE TABLE IF NOT EXISTS site_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES xxiv_sites(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'site_user',
  full_name TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS site_user_profiles_site_user
  ON site_user_profiles(site_id, id)
  WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_site_user_profiles_site
  ON site_user_profiles(site_id)
  WHERE role = 'site_user';

ALTER TABLE site_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site users read own profile" ON site_user_profiles;
CREATE POLICY "Site users read own profile"
  ON site_user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Site users update own profile" ON site_user_profiles;
CREATE POLICY "Site users update own profile"
  ON site_user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Builders read their site users" ON site_user_profiles;
CREATE POLICY "Builders read their site users"
  ON site_user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM xxiv_sites
      WHERE xxiv_sites.id = site_user_profiles.site_id
        AND xxiv_sites.user_id = auth.uid()
    )
  );
