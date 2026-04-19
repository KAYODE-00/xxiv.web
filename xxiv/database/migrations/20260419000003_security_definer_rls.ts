import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- 1. Create Security Definer functions to break recursion
    -- These run with bypass-RLS privileges but use auth.uid() internally.
    
    CREATE OR REPLACE FUNCTION public.is_xxiv_site_owner(_site_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.xxiv_sites
        WHERE id = _site_id AND user_id = auth.uid()
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    CREATE OR REPLACE FUNCTION public.is_xxiv_site_member(_site_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.xxiv_site_members
        WHERE site_id = _site_id AND user_id = auth.uid()
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    -- 2. Drop all previous collaboration policies
    DROP POLICY IF EXISTS "Users manage own sites" ON xxiv_sites;
    DROP POLICY IF EXISTS "Users view shared sites" ON xxiv_sites;
    DROP POLICY IF EXISTS "Users view own membership" ON xxiv_site_members;
    DROP POLICY IF EXISTS "Owners view site members" ON xxiv_site_members;
    DROP POLICY IF EXISTS "Owners manage site invites" ON xxiv_site_invites;
    DROP POLICY IF EXISTS "Users view received invites" ON xxiv_site_invites;

    -- 3. Apply fresh, function-based policies (NON-RECURSIVE)
    
    -- xxiv_sites
    CREATE POLICY "xxiv_sites_owner_policy" ON xxiv_sites
      FOR ALL USING (auth.uid() = user_id);

    CREATE POLICY "xxiv_sites_member_select_policy" ON xxiv_sites
      FOR SELECT USING (public.is_xxiv_site_member(id));

    -- xxiv_site_members
    CREATE POLICY "xxiv_site_members_self_policy" ON xxiv_site_members
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY "xxiv_site_members_owner_policy" ON xxiv_site_members
      FOR ALL USING (public.is_xxiv_site_owner(site_id));

    -- xxiv_site_invites
    CREATE POLICY "xxiv_site_invites_owner_policy" ON xxiv_site_invites
      FOR ALL USING (public.is_xxiv_site_owner(site_id));

    CREATE POLICY "xxiv_site_invites_member_select_policy" ON xxiv_site_invites
      FOR SELECT USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS public.is_xxiv_site_owner;
    DROP FUNCTION IF EXISTS public.is_xxiv_site_member;
  `);
}
