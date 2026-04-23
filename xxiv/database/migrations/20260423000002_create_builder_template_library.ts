import type { Knex } from 'knex';
import { builderTemplateSeeds } from '../seeds/builderTemplateSeeds';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('xxiv_builder_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('key').notNullable().unique();
    table.text('name').notNullable();
    table.text('type').notNullable();
    table.text('category').notNullable().defaultTo('Other');
    table.text('preview_image_url').nullable();
    table.text('source').notNullable().defaultTo('user');
    table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
    table.jsonb('template').notNullable();
    table.boolean('is_system').notNullable().defaultTo(false);
    table.boolean('is_published').notNullable().defaultTo(true);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true }).nullable();
  });

  await knex.schema.raw(
    "ALTER TABLE xxiv_builder_templates ADD CONSTRAINT xxiv_builder_templates_type_check CHECK (type IN ('layout', 'element'))"
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_builder_templates_type_category_sort ON xxiv_builder_templates(type, category, sort_order)'
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_builder_templates_published_deleted ON xxiv_builder_templates(is_published, deleted_at)'
  );

  await knex.schema.raw('ALTER TABLE xxiv_builder_templates ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw(`
    CREATE POLICY "Public can view published builder templates"
    ON xxiv_builder_templates FOR SELECT
    USING (is_published = true AND deleted_at IS NULL)
  `);
  await knex.schema.raw(`
    CREATE POLICY "Authenticated users can modify builder templates"
    ON xxiv_builder_templates FOR ALL
    USING ((SELECT auth.uid()) IS NOT NULL)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL)
  `);

  const rows = builderTemplateSeeds.map((item) => ({
    key: item.key,
    name: item.name,
    type: item.type,
    category: item.category,
    preview_image_url: item.preview_image_url || null,
    source: item.source,
    tags: item.tags || [],
    template: item.template,
    is_system: true,
    is_published: true,
    sort_order: item.sort_order || 0,
  }));

  if (rows.length > 0) {
    await knex('xxiv_builder_templates').insert(rows);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP POLICY IF EXISTS "Authenticated users can modify builder templates" ON xxiv_builder_templates');
  await knex.schema.raw('DROP POLICY IF EXISTS "Public can view published builder templates" ON xxiv_builder_templates');
  await knex.schema.dropTableIfExists('xxiv_builder_templates');
}
