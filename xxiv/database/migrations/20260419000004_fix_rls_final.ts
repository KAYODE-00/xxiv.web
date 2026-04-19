import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- 1. Drop EVERYTHING related to the previous attempts
    DROP POLICY IF EXISTS "xxiv_sites_owner_policy" ON xxiv_sites;
    DROP POLICY IF EXISTS "xxiv_sites_member_select_policy" ON xxiv_sites;
    DROP POLICY IF EXISTS "xxiv_site_members_self_policy" ON xxiv_site_members;
    DROP POLICY IF EXISTS "xxiv_site_members_owner_policy" ON xxiv_site_members;
    DROP POLICY IF EXISTS "xxiv_site_invites_owner_policy" ON xxiv_site_invites;
    DROP POLICY IF EXISTS "xxiv_site_invites_member_select_policy" ON xxiv_site_invites;

    -- Also drop the functions just in case they were the ones confusing the engine
    DROP FUNCTION IF EXISTS public.is_xxiv_site_owner(UUID);
    DROP FUNCTION IF EXISTS public.is_xxiv_site_member(UUID);

    -- 2. Clean, Simple, Non-Recursive Policies
    
    -- XXIV_SITES
    -- Basic ownership (ALL)
    CREATE POLICY "sites_owner" ON xxiv_sites
      FOR ALL USING (auth.uid() = user_id);

    -- Member access (SELECT only)
    -- This uses a subquery on xxiv_site_members which will trigger its 'members_self' policy.
    CREATE POLICY "sites_member_select" ON xxiv_sites
      FOR SELECT USING (
        id IN (SELECT site_id FROM xxiv_site_members WHERE user_id = auth.uid())
      );

    -- XXIV_SITE_MEMBERS
    -- See your own membership (SELECT)
    CREATE POLICY "members_self" ON xxiv_site_members
      FOR SELECT USING (user_id = auth.uid());

    -- Owners see/manage all members of their sites (ALL)
    -- This uses a subquery on xxiv_sites which will trigger its 'sites_owner' policy.
    -- Since 'sites_owner' is a simple O(1) comparison, it DOES NOT recurse back to members.
    CREATE POLICY "members_owner" ON xxiv_site_members
      FOR ALL USING (
        site_id IN (SELECT id FROM xxiv_sites WHERE user_id = auth.uid())
      );

    -- XXIV_SITE_INVITES
    -- Owners manage invites
    CREATE POLICY "invites_owner" ON xxiv_site_invites
      FOR ALL USING (
        site_id IN (SELECT id FROM xxiv_sites WHERE user_id = auth.uid())
      );

    -- Users see invites sent to their email
    CREATE POLICY "invites_member" ON xxiv_site_invites
      FOR SELECT USING (
        LOWER(email) = LOWER(auth.jwt() ->> 'email')
      );
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Logic to revert
}
