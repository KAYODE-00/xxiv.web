import { getKnexClient, closeKnexClient } from '../lib/knex-client.ts';
import { templateSeedData } from './template-seed-data.ts';

/** Convert a JS string array to a PostgreSQL text[] literal, e.g. {"a","b"} */
function pgArray(arr: string[]): string {
  return `{${arr.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(',')}}`;
}

async function seedTemplates() {
  const knex = await getKnexClient();

  for (const template of templateSeedData) {
    await knex.transaction(async (trx) => {
      await trx('xxiv_templates').insert({
        id: template.id,
        name: template.name,
        slug: template.slug,
        description: template.description,
        category: template.category,
        thumbnail_url: template.thumbnail_url,
        preview_url: template.preview_url,
        tags: pgArray(template.tags),
        is_featured: template.is_featured,
        is_published: true,
        sort_order: template.sort_order,
        updated_at: trx.fn.now(),
      })
        .onConflict('slug')
        .merge({
          name: template.name,
          description: template.description,
          category: template.category,
          thumbnail_url: template.thumbnail_url,
          preview_url: template.preview_url,
          tags: pgArray(template.tags),
          is_featured: template.is_featured,
          is_published: true,
          sort_order: template.sort_order,
          updated_at: trx.fn.now(),
        });

      const persistedTemplate = await trx('xxiv_templates')
        .where({ slug: template.slug })
        .first('id');

      if (!persistedTemplate?.id) {
        throw new Error(`Failed to resolve template ${template.slug}`);
      }

      await trx('xxiv_template_pages').where({ template_id: persistedTemplate.id }).del();

      for (const page of template.pages) {
        await trx('xxiv_template_pages').insert({
          id: page.id,
          template_id: persistedTemplate.id,
          name: page.name,
          slug: page.slug,
          is_index: page.is_index,
          page_order: page.page_order,
          settings: JSON.stringify(page.settings),
          updated_at: trx.fn.now(),
        });

        await trx('xxiv_template_layers').insert({
          template_page_id: page.id,
          layers: JSON.stringify(page.layers),
          generated_css: null,
        });
      }
    });

    console.log(`Seeded template: ${template.name}`);
  }
}

seedTemplates()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeKnexClient();
  });
