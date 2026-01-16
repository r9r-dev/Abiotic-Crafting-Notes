-- Migration: Refonte de la table items vers JSONB hybride
-- Date: 2026-01-16

BEGIN;

-- 1. Sauvegarder l'ancienne table si elle existe
DROP TABLE IF EXISTS items_backup;
ALTER TABLE IF EXISTS items RENAME TO items_backup;

-- 2. Supprimer les contraintes de clé étrangère temporairement
ALTER TABLE IF EXISTS order_items DROP CONSTRAINT IF EXISTS order_items_item_id_fkey;

-- 3. Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. Fonction pour la recherche sans accents
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS $$
    SELECT public.unaccent($1)
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- 5. Nouvelle table items avec JSONB
CREATE TABLE items (
    id VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,

    -- Colonnes générées pour l'indexation et la recherche
    name VARCHAR(255) GENERATED ALWAYS AS (data->>'name') STORED,
    category VARCHAR(100) GENERATED ALWAYS AS (data->>'category') STORED,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Index pour la recherche fuzzy sur le nom
CREATE INDEX IF NOT EXISTS idx_items_name_trgm ON items USING gin (f_unaccent(lower(name)) gin_trgm_ops);

-- 7. Index sur la catégorie
CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);

-- 8. Index GIN sur le JSONB pour les requêtes JSON
CREATE INDEX IF NOT EXISTS idx_items_data ON items USING gin (data);

-- 9. Index pour la recherche par type de source
CREATE INDEX IF NOT EXISTS idx_items_source_types ON items USING gin ((data->'source_types'));

-- 10. Recréer la contrainte de clé étrangère
ALTER TABLE order_items
    ADD CONSTRAINT order_items_item_id_fkey
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 11. Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 12. Trigger pour auto-update de updated_at
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Note: Après l'import des données, vous pouvez supprimer items_backup:
-- DROP TABLE IF EXISTS items_backup;
