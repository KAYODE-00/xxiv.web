import { closeKnexClient, getKnexClient } from '../lib/knex-client.ts';
import {
  professionalLibraryPack,
  professionalTemplatePack,
} from './professional-template-pack.ts';

async function seedProfessionalTemplatePack() {
  const knex = await getKnexClient();

  for (const template of professionalTemplatePack) {
    await knex.transaction(async (trx) => {
      await trx('xxiv_templates')
        .insert({
          id: template.id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          category: template.category,
          thumbnail_url: template.thumbnail_url,
          preview_url: template.preview_url,
          tags: template.tags,
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
          tags: template.tags,
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

    console.log(`Seeded professional site template: ${template.name}`);
  }

  for (const template of professionalLibraryPack) {
    await knex('xxiv_builder_templates')
      .insert({
        key: template.key,
        name: template.name,
        type: template.type,
        category: template.category,
        preview_image_url: template.preview_image_url || null,
        source: template.source,
        tags: template.tags || [],
        template: template.template,
        is_system: true,
        is_published: true,
        sort_order: template.sort_order || 0,
        updated_at: knex.fn.now(),
      })
      .onConflict('key')
      .merge({
        name: template.name,
        type: template.type,
        category: template.category,
        preview_image_url: template.preview_image_url || null,
        source: template.source,
        tags: template.tags || [],
        template: template.template,
        is_system: true,
        is_published: true,
        sort_order: template.sort_order || 0,
        updated_at: knex.fn.now(),
        deleted_at: null,
      });

    console.log(`Seeded professional library template: ${template.name}`);
  }
}

seedProfessionalTemplatePack()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeKnexClient();
  });
