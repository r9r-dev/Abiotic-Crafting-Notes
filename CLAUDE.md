# Abiotic Crafting Notes

Carnet de commandes collaboratif pour le jeu Abiotic Factor.
Domaine: `abiotic.hellonowork.com`

## Stack technique

- **Frontend**: React 19, Vite, shadcn/ui, TailwindCSS, TypeScript, Bun
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL 18+ (externe sur `sql:5432`)
- **Auth**: Pangolin SSO via headers HTTP (Remote-User, Remote-Email, Remote-Name)

## Structure du projet

```
.
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Header, OrderCard, DependencyTree, ui/*
│   │   ├── contexts/       # AuthContext, CartContext
│   │   ├── pages/          # OrdersPage, SearchPage, KitchenPage, WorkshopPage, CartPage
│   │   ├── services/       # Client API (api.ts)
│   │   ├── types/          # Types TypeScript
│   │   └── lib/            # Utilitaires
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── app/
│   │   ├── api/            # Routes (auth, orders, recipes, items, icons)
│   │   ├── models/         # User, Order, OrderItem, Item (JSONB)
│   │   ├── services/       # item_service, order_service
│   │   ├── schemas/        # Pydantic schemas (item.py, order.py)
│   │   └── main.py
│   ├── migrations/         # Scripts SQL de migration
│   ├── scripts/            # Scripts d'import
│   ├── scraper/            # Wiki scraper
│   └── requirements.txt
├── data/
│   ├── icons/              # Icones des items
│   ├── recipes_fr.json     # Donnees scrapees avec traductions FR
│   └── *.json              # Autres fichiers de localisation
├── docs/
└── docker-compose.yml
```

## Pages frontend

| Route | Page | Description |
|-------|------|-------------|
| / | OrdersPage | Liste des commandes |
| /search | SearchPage | Recherche d'items avec details et sources (onglets) |
| /kitchen | KitchenPage | Magasin Cuisine (items Baking) + panier |
| /workshop | WorkshopPage | Magasin Assemblage (items Crafting) + panier |
| /cart | CartPage | Panier separe en 2 sections (Cuisine/Assemblage) |

## Modele de donnees

### Item (JSONB hybride)

```sql
CREATE TABLE items (
    id VARCHAR(100) PRIMARY KEY,
    data JSONB NOT NULL,
    name VARCHAR(255) GENERATED ALWAYS AS (data->>'name') STORED,
    category VARCHAR(100) GENERATED ALWAYS AS (data->>'category') STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Structure JSON dans `data`:
```json
{
  "id": "item_id",
  "name": "Nom francais",
  "description": "Description...",
  "icon_local": "/api/icons/item_id.png",
  "wiki_url": "https://...",
  "category": "Categorie",
  "weight": 1.0,
  "stack_size": 10,
  "source_types": [
    {"type": "Crafting", "station": "Etabli"},
    {"type": "Baking", "item": "Item cru", "station": "Four"}
  ],
  "variants": [
    {"ingredients": [...], "station": "...", "result_quantity": 1}
  ],
  "locations": [{"area": "Zone", "details": null}]
}
```

Types de sources: Baking, Burning, Crafting, Fishing, Killing, Salvaging, Trading, Upgrading, World

### Order / OrderItem

- Order: id, requester_id, crafter_id, status, notes, items[]
- OrderItem: id, order_id, item_id, quantity
- Status: pending | accepted | in_progress | missing_resources | completed | cancelled

## API Endpoints

### Items (nouveau)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/items | Recherche (q=, category=, source=) |
| GET | /api/items/categories | Categories (source=) |
| GET | /api/items/baking | Items Cuisine |
| GET | /api/items/crafting | Items Assemblage |
| GET | /api/items/{id} | Detail complet avec sources |
| GET | /api/items/{id}/dependencies | Arbre de dependances |
| GET | /api/items/{id}/resources | Ressources de base |

### Recipes (compatibilite)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/recipes | Recherche (q=, category=, source=) |
| GET | /api/recipes/{id} | Detail recette |

### Orders
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/orders | Liste (status=, mine=, assigned=) |
| POST | /api/orders | Creer {items, notes} |
| POST | /api/orders/{id}/accept | Accepter |
| POST | /api/orders/{id}/complete | Terminer |
| POST | /api/orders/{id}/cancel | Annuler |

### Icons
| GET | /api/icons/{id}.png | Icone d'un item |

## Extensions PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE FUNCTION f_unaccent(text) RETURNS text AS $$
    SELECT public.unaccent($1)
$$ LANGUAGE SQL IMMUTABLE STRICT;
```

## Migration et import

```bash
# 1. Executer la migration
psql -h HOST -U USER -d abiotic-factor -f backend/migrations/001_jsonb_items.sql

# 2. Importer les donnees
python3 -c "
import json
# Generer import SQL depuis data/recipes_fr.json
# Executer avec psql
"
```

## Developpement local

```bash
# Backend
cd backend
source .venv/bin/activate
DEV_MODE=true POSTGRES_HOST=10.0.0.4 POSTGRES_USER=... POSTGRES_PASSWORD=... POSTGRES_DB=abiotic-factor uvicorn app.main:app --reload --port 8080

# Frontend
cd frontend
bun install
bun dev  # http://localhost:3000
```

## Scraper Wiki

```bash
cd backend
source .venv/bin/activate
python -m scraper.wiki_scraper
```

Sauvegarde dans `data/recipes_fr.json` avec noms et descriptions en francais.

## CI/CD

GitHub Actions: push tag `v*` -> build images -> push ghcr.io -> release GitHub

```bash
git tag v1.1.0
git push origin v1.1.0
```

## Version actuelle

v1.1.0 - Nouveau format JSONB, magasins Cuisine/Assemblage, panier separe
