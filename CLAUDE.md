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
│   │   ├── components/     # Header, OrderCard, RecipeSearch, DependencyTree
│   │   ├── contexts/       # AuthContext
│   │   ├── pages/          # OrdersPage, RecipesPage, CalculatorPage
│   │   ├── services/       # Client API (api.ts)
│   │   ├── types/          # Types TypeScript
│   │   └── lib/            # Utilitaires (cn, formatDate, getDisplayName, getIconUrl)
│   ├── Dockerfile          # Build multi-stage (bun -> nginx)
│   └── nginx.conf          # Config nginx avec proxy /api -> backend
├── backend/
│   ├── app/
│   │   ├── api/            # Routes (auth, orders, recipes, icons)
│   │   ├── models/         # User, Order, OrderItem, Item
│   │   ├── services/       # recipe_service, order_service
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── auth.py         # Auth Pangolin (headers)
│   │   ├── config.py       # Settings avec pydantic-settings
│   │   ├── database.py     # SQLAlchemy session
│   │   └── main.py         # FastAPI app
│   ├── scraper/            # Wiki scraper (wiki_scraper.py)
│   ├── Dockerfile
│   └── requirements.txt
├── data/
│   ├── icons/              # Icones des items (760 fichiers PNG)
│   ├── recipes.json        # Donnees brutes du scraper
│   ├── item_names_fr.json  # Traductions FR des noms
│   ├── item_descriptions_fr.json  # Descriptions FR
│   ├── en.json             # Export localisation EN du jeu
│   └── fr.json             # Export localisation FR du jeu
├── docs/                   # USER_MANUAL, DEPLOYMENT, API
├── .github/workflows/      # CI Docker (docker.yml)
├── docker-compose.yml      # Production (images ghcr.io)
└── docker-compose.dev.yml  # Dev local (PostgreSQL inclus)
```

## Variables d'environnement

```bash
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_HOST=sql          # ou localhost en dev
POSTGRES_PORT=5432
POSTGRES_DB=abiotic-factor
DEV_MODE=false             # true pour auth fictive
```

## Modeles de donnees

### User (depuis Pangolin SSO)
- id (string PK)
- email, name
- created_at, updated_at

### Item (table PostgreSQL)
- id (varchar PK) - ex: "air_compressor"
- name (varchar) - nom anglais
- name_fr (varchar) - nom francais
- description_fr (text) - description francaise
- icon_url (varchar) - URL wiki originale
- icon_local (varchar) - chemin local "/api/icons/{id}.png"
- category (varchar)
- weight, stack_size, durability
- repair_material, repair_quantity
- wiki_url
- variants (JSONB) - recettes de craft

### Order
- id (serial PK)
- requester_id -> User
- crafter_id -> User (nullable)
- status: pending | accepted | in_progress | missing_resources | completed | cancelled
- notes, missing_resources (JSON)
- items -> OrderItem[]

### OrderItem
- id, order_id -> Order
- item_id -> Item, quantity

## Extensions PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;  -- Recherche sans accents
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- Recherche fuzzy

-- Fonction pour index de recherche
CREATE FUNCTION f_unaccent(text) RETURNS text AS $$
SELECT public.unaccent($1)
$$ LANGUAGE SQL IMMUTABLE;
```

## API Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/auth/me | Utilisateur courant |
| GET | /api/recipes | Recherche (q=, category=) - FR/EN sans accents |
| GET | /api/recipes/categories | Liste categories |
| GET | /api/recipes/{id} | Detail recette avec name_fr, description_fr |
| GET | /api/recipes/{id}/dependencies | Arbre (quantity=) |
| GET | /api/recipes/{id}/resources | Ressources totales |
| GET | /api/icons/{id}.png | Icone d'un item |
| GET | /api/orders | Liste (status=, mine=, assigned=) |
| POST | /api/orders | Creer {items, notes} |
| PATCH | /api/orders/{id} | Modifier |
| POST | /api/orders/{id}/accept | Accepter |
| POST | /api/orders/{id}/complete | Terminer |
| POST | /api/orders/{id}/cancel | Annuler |

## Recherche

La recherche `/api/recipes?q=` est:
- Insensible a la casse
- Insensible aux accents (ex: "gelee" trouve "Gelée")
- Multi-champs: name (EN), name_fr (FR), description_fr

## CI/CD

GitHub Actions (`.github/workflows/docker.yml`):
- Trigger: push tag `v*`
- Build frontend et backend en parallele
- Push sur ghcr.io
- Cree release GitHub

Images:
- `ghcr.io/r9r-dev/abiotic-crafting-notes-frontend:latest`
- `ghcr.io/r9r-dev/abiotic-crafting-notes-backend:latest`

```bash
# Creer une release
git tag v1.0.3
git push origin v1.0.3
```

## Developpement local

```bash
# 1. Demarrer PostgreSQL
docker compose -f docker-compose.dev.yml up -d postgres

# 2. Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
DEV_MODE=true POSTGRES_HOST=localhost POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=abiotic-factor uvicorn app.main:app --reload --port 8080

# 3. Frontend (autre terminal)
cd frontend
bun install
bun dev  # http://localhost:3000
```

## Import des donnees

Les items sont stockes en PostgreSQL. Pour reimporter:

```bash
cd backend
source .venv/bin/activate
python -c "
from app.database import SessionLocal
# ... script d'import depuis data/*.json
"
```

## Scraper Wiki

Le scraper recupere les recettes depuis https://abioticfactor.wiki.gg

```bash
cd backend
source .venv/bin/activate
python -m scraper.wiki_scraper
```

- Delai 1.5s entre requetes (rate limiting)
- Retry auto sur 429
- Sauvegarde dans data/recipes.json
- Duree: ~15-20 minutes

Apres le scraping, reimporter les donnees en DB.

## Deploiement production

```bash
cp .env.example .env
# Editer POSTGRES_USER, POSTGRES_PASSWORD
docker compose up -d
```

Le frontend nginx proxy /api vers le backend.
Configurer Pangolin pour abiotic.hellonowork.com -> abiotic-frontend:80

Note: Monter data/icons/ en volume pour les icones.

## Version actuelle

v1.0.3 - Items en PostgreSQL, traductions FR, icones locales
