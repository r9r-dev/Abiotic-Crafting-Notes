# Abiotic Crafting Notes

Carnet de commandes collaboratif pour le jeu Abiotic Factor.
Domaine: `abiotic.hellonowork.com`

## Stack technique

- **Frontend**: React 19, Vite, shadcn/ui, TailwindCSS, TypeScript, Bun
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL (externe sur `sql:5432`)
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
│   │   └── lib/            # Utilitaires (cn, formatDate, getStatusLabel)
│   ├── Dockerfile          # Build multi-stage (bun -> nginx)
│   └── nginx.conf          # Config nginx avec proxy /api -> backend
├── backend/
│   ├── app/
│   │   ├── api/            # Routes (auth, orders, recipes)
│   │   ├── models/         # User, Order, OrderItem
│   │   ├── services/       # recipe_service, order_service
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── auth.py         # Auth Pangolin (headers)
│   │   ├── config.py       # Settings avec pydantic-settings
│   │   ├── database.py     # SQLAlchemy session
│   │   └── main.py         # FastAPI app
│   ├── scraper/            # Wiki scraper (wiki_scraper.py)
│   ├── Dockerfile
│   └── requirements.txt
├── data/                   # recipes.json (monte en volume)
├── docs/                   # USER_MANUAL, DEPLOYMENT, API
├── .agent/                 # Documentation systeme
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
POSTGRES_DB=abiotic
DEV_MODE=false             # true pour auth fictive
RECIPES_DATA_PATH=/app/data/recipes.json  # chemin des recettes
```

## Modeles de donnees

### User (depuis Pangolin SSO)
- id (string PK)
- email, name
- created_at, updated_at

### Order
- id (serial PK)
- requester_id -> User
- crafter_id -> User (nullable)
- status: pending | accepted | in_progress | missing_resources | completed | cancelled
- notes, missing_resources (JSON)
- items -> OrderItem[]

### OrderItem
- id, order_id -> Order
- item_id (ref JSON), quantity

### Recipe (JSON, pas en DB)
- id, name, icon_url, category
- variants: [{ingredients: [{item_id, item_name, quantity}], station}]
- weight, stack_size, durability, wiki_url

## API Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/auth/me | Utilisateur courant |
| GET | /api/recipes | Recherche (q=, category=) |
| GET | /api/recipes/categories | Liste categories |
| GET | /api/recipes/{id} | Detail recette |
| GET | /api/recipes/{id}/dependencies | Arbre (quantity=) |
| GET | /api/recipes/{id}/resources | Ressources totales |
| GET | /api/orders | Liste (status=, mine=, assigned=) |
| POST | /api/orders | Creer {items, notes} |
| PATCH | /api/orders/{id} | Modifier |
| POST | /api/orders/{id}/accept | Accepter |
| POST | /api/orders/{id}/complete | Terminer |
| POST | /api/orders/{id}/cancel | Annuler |

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
git tag v1.0.2
git push origin v1.0.2
```

## Developpement local

```bash
# 1. Demarrer PostgreSQL
docker compose -f docker-compose.dev.yml up -d postgres

# 2. Backend
cd backend
source .venv/bin/activate  # ou: python -m venv .venv && source...
pip install -r requirements.txt
DEV_MODE=true POSTGRES_HOST=localhost POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=abiotic uvicorn app.main:app --reload --port 8080

# 3. Frontend (autre terminal)
cd frontend
bun install
bun dev  # http://localhost:3000
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

## Deploiement production

```bash
cp .env.example .env
# Editer POSTGRES_USER, POSTGRES_PASSWORD
docker compose up -d
```

Le frontend nginx proxy /api vers le backend.
Configurer Pangolin pour abiotic.hellonowork.com -> abiotic-frontend:80

## Version actuelle

v1.0.2 - Ajout logo et amélioration scraper
