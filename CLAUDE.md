# Abiotic Science Database

`abiotic.hellonowork.com`

# ATTENTION
OBLIGATOIRE : Ne jamais simplifier, prendre de raccourcis. Ne pas faire quelque chose de simple en attendant de faire mieux plus tard. Il ne faut jamais contourner un problème. Il faut le résoudre proprement.

## Stack technique

- **Frontend**: React 19, Vite 6, shadcn/ui, TailwindCSS, TypeScript 5.6, Bun, Motion
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic
- **Database**: PostgreSQL (externe sur `sql:5432`)
- **Auth**: Pangolin SSO via headers HTTP (Remote-User, Remote-Email, Remote-Name)

## Structure du projet

```
.
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui (tabs, card, button, etc.)
│   │   │   ├── item/           # 14 composants affichage items
│   │   │   ├── npc/            # 5 composants affichage NPCs
│   │   │   ├── Header.tsx
│   │   │   ├── SearchPanel.tsx # Recherche avec debounce
│   │   │   └── PageTransition.tsx
│   │   ├── contexts/           # AuthContext
│   │   ├── pages/              # HomePage, ItemPage
│   │   ├── services/           # api.ts
│   │   ├── types/              # Types complets (~280 lignes)
│   │   ├── hooks/              # useItemLink
│   │   └── lib/                # utils, enumLabels
│   ├── Dockerfile              # Multi-stage Bun + Nginx
│   └── nginx.conf
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py         # GET /auth/me
│   │   │   └── items.py        # GET /items/{row_id}, /items/search
│   │   ├── models/             # 13 modeles ORM
│   │   ├── schemas/            # Pydantic responses
│   │   ├── auth.py             # Extraction headers Pangolin
│   │   ├── config.py           # Settings
│   │   └── main.py
│   └── requirements.txt
├── data/                       # Icons, GUI (NPC images), traductions, datatables
├── .github/workflows/          # CI/CD docker.yml
└── docker-compose.yml
```

## Modeles de donnees

**Backend (SQLAlchemy)**: User, Item, Weapon, Equipment, Consumable, Deployable, Recipe, RecipeIngredient, ItemUpgrade, Salvage, SalvageDrop, Bench, NPC, Plant, Projectile

**Frontend (TypeScript)**: Types miroir + relations inverses (UsedInRecipe, UsedInUpgrade, UpgradedFrom) + chaines de transformation (upgrade_chain, cooking_chain)

## API Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/auth/me | Utilisateur connecte |
| GET | /api/items/{row_id} | Detail item complet avec relations |
| GET | /api/items/search?q= | Recherche items (max 20 resultats) |
| GET | /api/npcs/{row_id} | Detail NPC complet avec loot tables |
| GET | /api/npcs/search?q= | Recherche NPCs (max 20 resultats) |
| GET | /api/npcs/list | Liste NPCs avec pagination |

Tu as le droit de tester l'api sur l'url de prod : https://abiotic.hellonowork.com/

## Logique de recherche

- Normalisation: accents (NFD), ligatures (oe->oe), points (F.O.R.G.E.->FORGE)
- Recherche sur nom OU description (case-insensitive)
- Priorite: correspondances nom > ordre alphabetique
- Frontend debounce: 300ms

## Composants item

`ItemHeader`, `ItemBaseStats`, `WeaponStats`, `EquipmentStats`, `ConsumableStats`, `DeployableStats`, `ItemRecipes`, `ItemSalvage`, `ItemUpgrades`, `ItemUsedInRecipes`, `ItemUsedInUpgrades`, `ItemUpgradedFrom`, `TransformationChain`

## Composants NPC

`NPCHeader`, `NPCCombatStats`, `NPCResistances`, `NPCBehavior`, `NPCLootTables`

## Assets statiques

| Route | Source | Description |
|-------|--------|-------------|
| /icons/ | data/icons/ | Icones items (1311+) |
| /npc-icons/ | data/GUI/Compendium/Entries/ | Images NPCs du Compendium (47) |

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

## Acces Base de donnees

**IMPORTANT** : L'acces a PostgreSQL est preconfigure via les variables d'environnement du systeme. La commande `psql` fonctionne directement sans arguments.

```bash
# Connexion directe (fonctionne tel quel, ne pas chercher a configurer)
psql

# Exemples de requetes
psql -c "SELECT COUNT(*) FROM items;"
psql -c "\dt"  # Lister les tables
```

Ne jamais supposer que l'acces est impossible. Si une erreur survient, verifier d'abord avec `psql -c "\conninfo"`.

## Acces Production

```bash
# Serveur de production
ssh cadence
```

**Chemins sur le serveur:**
- `/home/share/docker` : dossiers de volumes Docker
- `/home/share/docker/dockge/stacks` : stacks docker-compose

## CI/CD

GitHub Actions: push tag `v*` -> build images -> push ghcr.io -> release GitHub
