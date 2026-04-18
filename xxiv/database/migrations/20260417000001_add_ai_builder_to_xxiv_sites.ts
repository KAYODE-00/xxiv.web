import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const ensureColumn = async (column: string, apply: () => Promise<void>) => {
    const exists = await knex.schema.hasColumn('xxiv_sites', column);
    if (!exists) {
      await apply();
    }
  };

  await ensureColumn('mcp_token', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('mcp_token').nullable();
    });
  });

  await ensureColumn('mcp_url', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('mcp_url').nullable();
    });
  });

  await ensureColumn('live_url', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('live_url').nullable();
    });
  });

  await ensureColumn('cf_project_name', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('cf_project_name').nullable();
    });
  });

  await ensureColumn('custom_domain', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('custom_domain').nullable();
    });
  });

  await ensureColumn('custom_domain_verified', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.boolean('custom_domain_verified').defaultTo(false);
    });
  });

  await ensureColumn('publish_status', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.text('publish_status').defaultTo('unpublished');
    });
  });

  await ensureColumn('last_published_at', async () => {
    await knex.schema.alterTable('xxiv_sites', (table) => {
      table.timestamp('last_published_at', { useTz: true }).nullable();
    });
  });

  const hasAiBuilderLogs = await knex.schema.hasTable('ai_builder_logs');
  if (!hasAiBuilderLogs) {
    await knex.schema.createTable('ai_builder_logs', (table) => {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
      table.uuid('project_id').notNullable().references('id').inTable('xxiv_sites').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('auth.users').onDelete('CASCADE');
      table.text('input_type').notNullable();
      table.text('status').notNullable();
      table.jsonb('site_plan').nullable();
      table.text('error').nullable();
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });

    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_ai_builder_logs_project_id ON ai_builder_logs(project_id)');
    await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_ai_builder_logs_user_id ON ai_builder_logs(user_id)');
    await knex.schema.raw('ALTER TABLE ai_builder_logs ENABLE ROW LEVEL SECURITY');

    await knex.schema.raw(`
      CREATE POLICY "Users can view own AI builder logs"
        ON ai_builder_logs FOR SELECT
        USING (auth.uid() = user_id)
    `);

    await knex.schema.raw(`
      CREATE POLICY "Users can insert own AI builder logs"
        ON ai_builder_logs FOR INSERT
        WITH CHECK (auth.uid() = user_id)
    `);

    await knex.schema.raw(`
      CREATE POLICY "Users can update own AI builder logs"
        ON ai_builder_logs FOR UPDATE
        USING (auth.uid() = user_id)
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasAiBuilderLogs = await knex.schema.hasTable('ai_builder_logs');
  if (hasAiBuilderLogs) {
    await knex.schema.dropTableIfExists('ai_builder_logs');
  }
}
