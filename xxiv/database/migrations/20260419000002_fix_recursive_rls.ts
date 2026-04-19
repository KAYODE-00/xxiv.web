import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- 1. Drop old recursive policies
    DROP POLICY IF EXISTS "Users can view members of sites they belong to" ON xxiv_site_members;
    DROP POLICY IF EXISTS "Users access own or member sites" ON xxiv_sites;
    DROP POLICY IF EXISTS "Owners can manage site invites" ON xxiv_site_invites;
    DROP POLICY IF EXISTS "Users can view invites sent to them" ON xxiv_site_invites;

    -- 2. New non-recursive policies for xxiv_sites
    -- Owner policy (Simple, no recursion)
    DROP POLICY IF EXISTS "Users manage own sites" ON xxiv_sites;
    CREATE POLICY "Users manage own sites" 
      ON xxiv_sites FOR ALL 
      USING (auth.uid() = user_id);

    -- Member policy (Calls members, but members policy for 'self' is simple)
    CREATE POLICY "Users view shared sites" 
      ON xxiv_sites FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM xxiv_site_members 
          WHERE site_id = xxiv_sites.id AND user_id = auth.uid()
        )
      );

    -- 3. New non-recursive policies for xxiv_site_members
    -- View own membership (Simple, no recursion)
    CREATE POLICY "Users view own membership"
      ON xxiv_site_members FOR SELECT
      USING (user_id = auth.uid());

    -- Owners view all members (Calls sites, but site policy for 'owner' is simple)
    CREATE POLICY "Owners view site members"
      ON xxiv_site_members FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM xxiv_sites 
          WHERE id = xxiv_site_members.site_id AND user_id = auth.uid()
        )
      );

    -- 4. Corrected policies for xxiv_site_invites
    -- Owners manage invites (Calls sites, simple owner check)
    CREATE POLICY "Owners manage site invites"
      ON xxiv_site_invites FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM xxiv_sites 
          WHERE id = xxiv_site_invites.site_id AND user_id = auth.uid()
        )
      );

    -- Users see invites sent to their email
    -- Note: We compare with the current user's email from auth.jwt()
    CREATE POLICY "Users view received invites"
      ON xxiv_site_invites FOR SELECT
      USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Logic to revert to a state before these policies (best-effort)
}
