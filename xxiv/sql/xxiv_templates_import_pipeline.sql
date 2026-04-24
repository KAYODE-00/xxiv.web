ALTER TABLE xxiv_templates
ADD COLUMN IF NOT EXISTS layers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_xxiv_templates_meta_gin
  ON xxiv_templates
  USING GIN (meta);

CREATE INDEX IF NOT EXISTS idx_xxiv_templates_layers_gin
  ON xxiv_templates
  USING GIN (layers);

CREATE INDEX IF NOT EXISTS idx_xxiv_templates_published_category
  ON xxiv_templates (category)
  WHERE is_published = true;
