-- XXIV Sites table
CREATE TABLE IF NOT EXISTS xxiv_sites (
  id UUID PRIMARY KEY 
    DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  user_id UUID NOT NULL 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  is_published BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  page_folder_id UUID,
  home_page_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique slug per user (not globally)
CREATE UNIQUE INDEX IF NOT EXISTS 
  xxiv_sites_user_slug 
  ON xxiv_sites(user_id, slug);

-- CRITICAL: Row Level Security
ALTER TABLE xxiv_sites 
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS 
  "Users manage own sites" 
  ON xxiv_sites;

CREATE POLICY "Users manage own sites" 
  ON xxiv_sites FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
