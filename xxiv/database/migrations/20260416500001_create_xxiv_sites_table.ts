import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('xxiv_sites');

  if (!hasTable) {
    await knex.schema.createTable('xxiv_sites', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('name').notNullable();
      table.text('slug').notNullable();
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('auth.users')
        .onDelete('CASCADE');
      table.text('plan').notNullable().defaultTo('free');
      table.boolean('is_published').defaultTo(false);
      table.text('thumbnail_url').nullable();
      table.uuid('page_folder_id').nullable();
      table.uuid('home_page_id').nullable();
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  }

  await knex.schema.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS xxiv_sites_user_slug
    ON xxiv_sites(user_id, slug)
  `);

  await knex.schema.raw('ALTER TABLE xxiv_sites ENABLE ROW LEVEL SECURITY');

  await knex.schema.raw(`
    DROP POLICY IF EXISTS "Users manage own sites" ON xxiv_sites
  `);

  await knex.schema.raw(`
    CREATE POLICY "Users manage own sites"
    ON xxiv_sites FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    DROP POLICY IF EXISTS "Users manage own sites" ON xxiv_sites
  `);

  await knex.schema.raw(`
    DROP INDEX IF EXISTS xxiv_sites_user_slug
  `);

  await knex.schema.dropTableIfExists('xxiv_sites');
}
