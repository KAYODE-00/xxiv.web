import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasOwnerUserId = await knex.schema.hasColumn('mcp_tokens', 'owner_user_id');
  if (!hasOwnerUserId) {
    await knex.schema.alterTable('mcp_tokens', (table) => {
      table.uuid('owner_user_id').nullable().references('id').inTable('auth.users').onDelete('CASCADE');
    });
  }

  const hasSystemGenerated = await knex.schema.hasColumn('mcp_tokens', 'is_system_generated');
  if (!hasSystemGenerated) {
    await knex.schema.alterTable('mcp_tokens', (table) => {
      table.boolean('is_system_generated').notNullable().defaultTo(false);
    });
  }

  await knex.schema.raw(`
    UPDATE mcp_tokens AS mt
    SET
      owner_user_id = xs.user_id,
      is_system_generated = true
    FROM xxiv_sites AS xs
    WHERE xs.mcp_token = mt.token
      AND (mt.owner_user_id IS DISTINCT FROM xs.user_id OR mt.is_system_generated IS DISTINCT FROM true)
  `);

  await knex.schema.raw('DROP POLICY IF EXISTS "MCP tokens are viewable by authenticated users" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Authenticated users can create MCP tokens" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Authenticated users can update MCP tokens" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Authenticated users can delete MCP tokens" ON mcp_tokens');

  await knex.schema.raw(`
    CREATE POLICY "Users can view own visible MCP tokens"
      ON mcp_tokens FOR SELECT
      USING (
        auth.uid() = owner_user_id
        AND is_system_generated = false
      )
  `);

  await knex.schema.raw(`
    CREATE POLICY "Users can insert own visible MCP tokens"
      ON mcp_tokens FOR INSERT
      WITH CHECK (
        auth.uid() = owner_user_id
        AND is_system_generated = false
      )
  `);

  await knex.schema.raw(`
    CREATE POLICY "Users can update own visible MCP tokens"
      ON mcp_tokens FOR UPDATE
      USING (
        auth.uid() = owner_user_id
        AND is_system_generated = false
      )
  `);

  await knex.schema.raw(`
    CREATE POLICY "Users can delete own visible MCP tokens"
      ON mcp_tokens FOR DELETE
      USING (
        auth.uid() = owner_user_id
        AND is_system_generated = false
      )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP POLICY IF EXISTS "Users can view own visible MCP tokens" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Users can insert own visible MCP tokens" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Users can update own visible MCP tokens" ON mcp_tokens');
  await knex.schema.raw('DROP POLICY IF EXISTS "Users can delete own visible MCP tokens" ON mcp_tokens');

  await knex.schema.raw(`
    CREATE POLICY "MCP tokens are viewable by authenticated users"
      ON mcp_tokens FOR SELECT
      USING ((SELECT auth.uid()) IS NOT NULL)
  `);

  await knex.schema.raw(`
    CREATE POLICY "Authenticated users can create MCP tokens"
      ON mcp_tokens FOR INSERT
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL)
  `);

  await knex.schema.raw(`
    CREATE POLICY "Authenticated users can update MCP tokens"
      ON mcp_tokens FOR UPDATE
      USING ((SELECT auth.uid()) IS NOT NULL)
  `);

  await knex.schema.raw(`
    CREATE POLICY "Authenticated users can delete MCP tokens"
      ON mcp_tokens FOR DELETE
      USING ((SELECT auth.uid()) IS NOT NULL)
  `);
}
