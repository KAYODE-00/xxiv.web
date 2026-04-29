import type { Knex } from 'knex';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('pages', 'xxiv_site_id');

  if (!hasColumn) {
    await knex.schema.alterTable('pages', (table) => {
      table.uuid('xxiv_site_id').nullable();
    });
  }

  await knex.schema.raw(`
    UPDATE pages
    SET xxiv_site_id = NULLIF(settings #>> '{xxiv,site_id}', '')::uuid
    WHERE xxiv_site_id IS NULL
      AND settings IS NOT NULL
      AND settings->'xxiv' IS NOT NULL
      AND settings #>> '{xxiv,site_id}' IS NOT NULL
  `);

  await knex.schema.raw(`
    UPDATE pages AS p
    SET xxiv_site_id = xs.id
    FROM xxiv_sites AS xs
    WHERE p.xxiv_site_id IS NULL
      AND xs.home_page_id = p.id
  `);

  await knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_pages_xxiv_site_id
    ON pages(xxiv_site_id, is_published)
    WHERE deleted_at IS NULL
  `);

  await knex.schema.raw('DROP INDEX IF EXISTS pages_slug_is_published_folder_unique');

  await knex.schema.raw(`
    CREATE UNIQUE INDEX pages_slug_is_published_folder_unique
    ON pages(
      COALESCE(xxiv_site_id, '${NIL_UUID}'::uuid),
      slug,
      is_published,
      COALESCE(page_folder_id, '${NIL_UUID}'::uuid),
      COALESCE(error_page, 0)
    )
    WHERE deleted_at IS NULL AND is_dynamic = false
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP INDEX IF EXISTS idx_pages_xxiv_site_id');
  await knex.schema.raw('DROP INDEX IF EXISTS pages_slug_is_published_folder_unique');

  await knex.schema.raw(`
    CREATE UNIQUE INDEX pages_slug_is_published_folder_unique
    ON pages(
      slug,
      is_published,
      COALESCE(page_folder_id, '${NIL_UUID}'::uuid),
      COALESCE(error_page, 0)
    )
    WHERE deleted_at IS NULL AND is_dynamic = false
  `);

  const hasColumn = await knex.schema.hasColumn('pages', 'xxiv_site_id');

  if (hasColumn) {
    await knex.schema.alterTable('pages', (table) => {
      table.dropColumn('xxiv_site_id');
    });
  }
}
