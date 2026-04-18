-- Create Site Members table
CREATE TABLE IF NOT EXISTS xxiv_site_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES xxiv_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'collaborator', -- 'owner', 'collaborator', 'viewer'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, user_id)
);

-- Create Site Invites table for tracking pending invitations
CREATE TABLE IF NOT EXISTS xxiv_site_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES xxiv_sites(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'ignored'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, email)
);

-- Enable RLS
ALTER TABLE xxiv_site_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE xxiv_site_invites ENABLE ROW LEVEL SECURITY;

-- Policies for xxiv_site_members
CREATE POLICY "Users can view members of sites they belong to"
  ON xxiv_site_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM xxiv_sites 
      WHERE id = site_id AND user_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

-- Update RLS for xxiv_sites to allow member access
DROP POLICY IF EXISTS "Users manage own sites" ON xxiv_sites;

CREATE POLICY "Users access own or member sites" 
  ON xxiv_sites FOR ALL 
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM xxiv_site_members 
      WHERE site_id = id AND user_id = auth.uid()
    )
  );

-- Policies for xxiv_site_invites
CREATE POLICY "Owners can manage site invites"
  ON xxiv_site_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM xxiv_sites 
      WHERE id = site_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view invites sent to them"
  ON xxiv_site_invites FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));
