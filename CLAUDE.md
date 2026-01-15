# Abiotic Crafting Notes

Carnet de commandes collaboratif pour le jeu Abiotic Factor.

## Stack technique

- **Frontend**: React 19, Vite, shadcn/ui, TailwindCSS, TypeScript
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL (externe)
- **Auth**: Pangolin SSO via headers HTTP

## Structure du projet

```
.
├── frontend/               # Application React
│   ├── src/
│   │   ├── components/     # Composants React (Header, OrderCard, etc.)
│   │   ├── contexts/       # AuthContext
│   │   ├── pages/          # OrdersPage, RecipesPage, CalculatorPage
│   │   ├── services/       # Client API
│   │   ├── types/          # Types TypeScript
│   │   └── lib/            # Utilitaires (cn, formatDate)
│   ├── Dockerfile          # Build multi-stage (bun -> nginx)
│   └── nginx.conf          # Config nginx avec proxy API
├── backend/
│   ├── app/
│   │   ├── api/            # Routes FastAPI (auth, orders, recipes)
│   │   ├── models/         # SQLAlchemy models (User, Order, OrderItem)
│   │   ├── services/       # Logique metier
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── auth.py         # Authentification Pangolin
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Session SQLAlchemy
│   │   └── main.py         # Point d'entree FastAPI
│   ├── scraper/            # Scraper du wiki
│   └── Dockerfile
├── data/                   # Fichier recipes.json
├── docs/                   # Documentation
├── docker-compose.yml      # Production
└── docker-compose.dev.yml  # Developpement
```

## Modeles de donnees

### User
- id (string, depuis Pangolin)
- email
- name
- created_at, updated_at

### Order
- id (auto)
- requester_id -> User
- crafter_id -> User (nullable)
- status: pending | accepted | in_progress | missing_resources | completed | cancelled
- notes
- missing_resources (JSON)
- items -> OrderItem[]

### OrderItem
- id (auto)
- order_id -> Order
- item_id (reference au JSON recipes)
- quantity

### Recipe (JSON, non en DB)
- id, name, icon_url, category
- variants: [{ingredients, station}]
- weight, stack_size, durability

## API Endpoints

- `GET /api/auth/me` - Utilisateur courant
- `GET /api/recipes` - Recherche recettes
- `GET /api/recipes/categories` - Categories
- `GET /api/recipes/{id}` - Detail recette
- `GET /api/recipes/{id}/dependencies` - Arbre dependances
- `GET /api/recipes/{id}/resources` - Ressources totales
- `GET /api/orders` - Liste commandes
- `POST /api/orders` - Creer commande
- `PATCH /api/orders/{id}` - Modifier commande
- `POST /api/orders/{id}/accept` - Accepter
- `POST /api/orders/{id}/complete` - Terminer
- `POST /api/orders/{id}/cancel` - Annuler

## Authentification

Pangolin envoie ces headers:
- `Remote-User`: ID unique
- `Remote-Email`: Email
- `Remote-Name`: Nom affiche

En dev, `DEV_MODE=true` utilise un utilisateur fictif.

## CI/CD

GitHub Actions workflow (`.github/workflows/docker.yml`):
- Declenche sur push de tag `v*`
- Build et push des images sur ghcr.io
- Cree une release GitHub

Images:
- `ghcr.io/r9r-dev/abiotic-crafting-notes-frontend:latest`
- `ghcr.io/r9r-dev/abiotic-crafting-notes-backend:latest`

Release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Deploiement

```bash
cp .env.example .env
# Editer POSTGRES_USER, POSTGRES_PASSWORD
docker compose up -d
```

## Commandes utiles

```bash
# Scraper le wiki
cd backend && python -m scraper.wiki_scraper

# Dev frontend
cd frontend && bun dev

# Dev backend
cd backend && DEV_MODE=true uvicorn app.main:app --reload
```
