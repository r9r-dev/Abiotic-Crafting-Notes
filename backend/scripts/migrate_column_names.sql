-- Migration: Renommage des colonnes de traduction
-- De: name_fr, description_fr, flavor_text_fr
-- Vers: name, description, flavor_text
--
-- Utilisation:
--   psql -h <host> -U <user> -d <database> -f migrate_column_names.sql
--
-- ============================================

BEGIN;

-- ============================================
-- Table: items
-- ============================================
ALTER TABLE items RENAME COLUMN name_fr TO name;
ALTER TABLE items RENAME COLUMN description_fr TO description;
ALTER TABLE items RENAME COLUMN flavor_text_fr TO flavor_text;

-- ============================================
-- Table: recipes
-- ============================================
ALTER TABLE recipes RENAME COLUMN name_fr TO name;

-- ============================================
-- Table: recipe_substitutes
-- ============================================
ALTER TABLE recipe_substitutes RENAME COLUMN name_fr TO name;
ALTER TABLE recipe_substitutes RENAME COLUMN description_fr TO description;

-- ============================================
-- Table: benches
-- ============================================
ALTER TABLE benches RENAME COLUMN name_fr TO name;
ALTER TABLE benches RENAME COLUMN description_fr TO description;

-- ============================================
-- Table: bench_upgrades
-- ============================================
ALTER TABLE bench_upgrades RENAME COLUMN name_fr TO name;
ALTER TABLE bench_upgrades RENAME COLUMN description_fr TO description;

-- ============================================
-- Table: npcs
-- ============================================
ALTER TABLE npcs RENAME COLUMN name_fr TO name;
ALTER TABLE npcs RENAME COLUMN description_fr TO description;

-- ============================================
-- Table: plants
-- ============================================
ALTER TABLE plants RENAME COLUMN name_fr TO name;
ALTER TABLE plants RENAME COLUMN description_fr TO description;

-- ============================================
-- Table: projectiles
-- ============================================
ALTER TABLE projectiles RENAME COLUMN name_fr TO name;
ALTER TABLE projectiles RENAME COLUMN description_fr TO description;

-- ============================================
-- Recréer les index (si existants)
-- ============================================

-- Supprimer les anciens index trigram
DROP INDEX IF EXISTS ix_items_name_fr_trgm;
DROP INDEX IF EXISTS ix_npcs_name_fr_trgm;
DROP INDEX IF EXISTS ix_items_category_name;

-- Recréer avec les nouveaux noms de colonnes
CREATE INDEX IF NOT EXISTS ix_items_name_trgm ON items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_npcs_name_trgm ON npcs USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS ix_items_category_name ON items (category, name);

COMMIT;

-- Verification
SELECT 'Migration terminee avec succes!' AS status;
