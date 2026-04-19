import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- 1. Drop ALL potentially recursive policies
    DROP POLICY IF EXISTS "sites_owner" ON xxiv_sites;
    DROP POLICY IF EXISTS "sites_member_select" ON xxiv_sites;
    DROP POLICY IF EXISTS "members_self" ON xxiv_site_members;
    DROP POLICY IF EXISTS "members_owner" ON xxiv_site_members;
    DROP POLICY IF EXISTS "invites_owner" ON xxiv_site_invites;
    DROP POLICY IF EXISTS "invites_member" ON xxiv_site_invites;

    -- 2. Create Security Definer functions with EXPLICIT BYPASS
    -- These MUST be created as a superuser (postgres) to bypass RLS.
    
    CREATE OR REPLACE FUNCTION public.check_is_site_owner(_site_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.xxiv_sites
        WHERE id = _site_id AND user_id = auth.uid()
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    CREATE OR REPLACE FUNCTION public.check_is_site_member(_site_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM public.xxiv_site_members
        WHERE site_id = _site_id AND user_id = auth.uid()
      );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

    -- 3. Apply policies using these functions
    
    -- xxiv_sites
    CREATE POLICY "xxiv_sites_owner_all" ON xxiv_sites
      FOR ALL USING (auth.uid() = user_id);

    CREATE POLICY "xxiv_sites_member_select" ON xxiv_sites
      FOR SELECT USING (public.check_is_site_member(id));

    -- xxiv_site_members
    CREATE POLICY "xxiv_site_members_self_select" ON xxiv_site_members
      FOR SELECT USING (user_id = auth.uid());

    CREATE POLICY "xxiv_site_members_owner_all" ON xxiv_site_members
      FOR ALL USING (public.check_is_site_owner(site_id));

    -- xxiv_site_invites
    CREATE POLICY "xxiv_site_invites_owner_all" ON xxiv_site_invites
      FOR ALL USING (public.check_is_site_owner(site_id));

    CREATE POLICY "xxiv_site_invites_self_select" ON xxiv_site_invites
      FOR SELECT USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));
  `);
}

export async function down(knex: Knex): Promise<void> {
}
