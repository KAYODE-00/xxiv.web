import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('xxiv_templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('name').notNullable();
    table.text('slug').notNullable().unique();
    table.text('description').notNullable().defaultTo('');
    table.text('category').notNullable().defaultTo('Other');
    table.text('thumbnail_url').nullable();
    table.text('preview_url').nullable();
    table.specificType('tags', 'text[]').notNullable().defaultTo('{}');
    table.boolean('is_featured').notNullable().defaultTo(false);
    table.boolean('is_published').notNullable().defaultTo(true);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('xxiv_template_pages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_id').notNullable();
    table.text('name').notNullable();
    table.text('slug').notNullable().defaultTo('');
    table.boolean('is_index').notNullable().defaultTo(false);
    table.integer('page_order').notNullable().defaultTo(0);
    table.jsonb('settings').notNullable().defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('xxiv_template_layers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('template_page_id').notNullable();
    table.jsonb('layers').notNullable().defaultTo('[]');
    table.text('generated_css').nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.raw(`
    ALTER TABLE xxiv_template_pages
    ADD CONSTRAINT fk_xxiv_template_pages_template
    FOREIGN KEY (template_id)
    REFERENCES xxiv_templates(id)
    ON DELETE CASCADE
  `);

  await knex.schema.raw(`
    ALTER TABLE xxiv_template_layers
    ADD CONSTRAINT fk_xxiv_template_layers_template_page
    FOREIGN KEY (template_page_id)
    REFERENCES xxiv_template_pages(id)
    ON DELETE CASCADE
  `);

  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_templates_category_published_sort ON xxiv_templates(category, is_published, sort_order)'
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_templates_featured_published ON xxiv_templates(is_featured, is_published)'
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_template_pages_template_order ON xxiv_template_pages(template_id, page_order)'
  );
  await knex.schema.raw(
    'CREATE INDEX IF NOT EXISTS idx_xxiv_template_layers_template_page ON xxiv_template_layers(template_page_id)'
  );

  await knex.schema.raw('ALTER TABLE xxiv_templates ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE xxiv_template_pages ENABLE ROW LEVEL SECURITY');
  await knex.schema.raw('ALTER TABLE xxiv_template_layers ENABLE ROW LEVEL SECURITY');

  await knex.schema.raw(`
    CREATE POLICY "Public can view published xxiv templates"
    ON xxiv_templates FOR SELECT
    USING (is_published = true)
  `);
  await knex.schema.raw(`
    CREATE POLICY "Public can view xxiv template pages"
    ON xxiv_template_pages FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM xxiv_templates
        WHERE xxiv_templates.id = xxiv_template_pages.template_id
          AND xxiv_templates.is_published = true
      )
    )
  `);
  await knex.schema.raw(`
    CREATE POLICY "Public can view xxiv template layers"
    ON xxiv_template_layers FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM xxiv_template_pages
        JOIN xxiv_templates ON xxiv_templates.id = xxiv_template_pages.template_id
        WHERE xxiv_template_pages.id = xxiv_template_layers.template_page_id
          AND xxiv_templates.is_published = true
      )
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw('DROP POLICY IF EXISTS "Public can view xxiv template layers" ON xxiv_template_layers');
  await knex.schema.raw('DROP POLICY IF EXISTS "Public can view xxiv template pages" ON xxiv_template_pages');
  await knex.schema.raw('DROP POLICY IF EXISTS "Public can view published xxiv templates" ON xxiv_templates');

  await knex.schema.dropTableIfExists('xxiv_template_layers');
  await knex.schema.dropTableIfExists('xxiv_template_pages');
  await knex.schema.dropTableIfExists('xxiv_templates');
}
