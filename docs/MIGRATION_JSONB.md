# Migration PostgreSQL JSONB

Plan de refonte du stockage des items vers une approche JSONB hybride.

## Objectifs

- Flexibilite : structure JSON evolutive sans migrations SQL
- Performance : colonnes generees pour les index de recherche
- Simplicite : plus de distinction FR/EN, une seule valeur par champ

## Schema SQL

```sql
CREATE TABLE items (
    id VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,

    -- Colonnes generees pour indexation
    name VARCHAR(255) GENERATED ALWAYS AS (data->>'name') STORED,
    category VARCHAR(100) GENERATED ALWAYS AS (data->>'category') STORED,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index recherche fuzzy
CREATE INDEX idx_items_name_trgm ON items USING gin (name gin_trgm_ops);
CREATE INDEX idx_items_category ON items (category);
CREATE INDEX idx_items_data ON items USING gin (data);
```

## Structure JSON (a finaliser apres scraping)

```json
{
  "id": "air_compressor",
  "name": "Compresseur d'air",
  "description": "Description de l'item...",
  "icon_local": "/api/icons/air_compressor.png",
  "wiki_url": "https://abioticfactor.wiki.gg/wiki/Air_Compressor",
  "category": "Tools",

  "sources": ["Crafting", "World"],

  "stats": {
    "weight": 5.0,
    "stack_size": 1,
    "durability": 100
  },

  "research": {
    "category": "Metal"
  },

  "crafting": [
    {
      "station": "Workbench",
      "ingredients": [
        {"id": "scrap_metal", "name": "Ferraille", "quantity": 5},
        {"id": "wire", "name": "Fil electrique", "quantity": 2}
      ],
      "result_quantity": 1
    }
  ],

  "salvage": [
    {"id": "scrap_metal", "name": "Ferraille", "min": 2, "max": 3}
  ],

  "locations": [
    {"area": "Laboratory", "details": "Sur les etablis"}
  ],

  "upgrades": [
    {
      "result_id": "advanced_compressor",
      "result_name": "Compresseur avance",
      "ingredients": [...]
    }
  ],

  "weapon": null,
  "gear": null,
  "ammo": null
}
```

## Points a finaliser apres scraping

### sources
- [ ] Confirmer si array ou string
- [ ] Valeurs possibles : Crafting, World, Upgrading, Trading, ?

### stats
- [ ] Champs : weight, stack_size, durability
- [ ] Autres stats a ajouter ?

### research
- [ ] Juste la categorie ou plus d'infos ?

### weapon (si applicable)
- [ ] type
- [ ] damage
- [ ] damage_type
- [ ] pellets (pour shotguns ?)
- [ ] max_ammo
- [ ] secondary_action
- [ ] ammunition (lien vers item ammo)

### gear (si applicable)
- [ ] slot (Head, Chest, etc.)
- [ ] applied_effects (liste d'effets)

### ammo (si applicable)
- [ ] Compatible avec quelles armes ?
- [ ] Autres stats ?

### crafting vs variants
- Renommer `variants` en `crafting` pour plus de clarte
- Chaque entree = une recette alternative

## Migration des donnees existantes

1. Exporter les items actuels
2. Fusionner name_fr -> name (priorite FR, fallback EN)
3. Fusionner description_fr -> description
4. Restructurer variants -> crafting
5. Importer dans nouveau schema

## Modifications backend

### Modele SQLAlchemy

```python
class Item(Base):
    __tablename__ = "items"

    id = Column(String(100), primary_key=True)
    data = Column(JSONB, nullable=False)

    # Colonnes generees (read-only en SQLAlchemy)
    name = Column(String(255))
    category = Column(String(100))

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
```

### API endpoints

Simplification :
- GET /api/recipes -> retourne directement le JSON
- Plus de transformation name/name_fr cote serveur
- Filtres sur colonnes generees (category, name)

### Import depuis scraper

```python
def import_from_scraper(scraped_data: dict):
    """Importe les donnees du scraper dans la nouvelle structure."""
    for item_id, raw in scraped_data.items():
        # Appliquer traductions FR si disponibles
        name = get_french_name(raw['name']) or raw['name']

        data = {
            "id": item_id,
            "name": name,
            "description": raw.get('description'),
            # ... restructurer selon nouveau format
        }

        db.merge(Item(id=item_id, data=data))
```

## Timeline

1. [ ] Attendre fin du scraping
2. [ ] Analyser structure reelle des donnees scrapees
3. [ ] Finaliser schema JSON
4. [ ] Creer migration Alembic
5. [ ] Adapter backend (modele, services, API)
6. [ ] Adapter frontend si necessaire
7. [ ] Script import donnees
8. [ ] Tests
