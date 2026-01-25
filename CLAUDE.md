# Abiotic Science Database

`abioticscience.fr`

# ATTENTION
OBLIGATOIRE : Ne jamais simplifier, prendre de raccourcis. Ne pas faire quelque chose de simple en attendant de faire mieux plus tard. Il ne faut jamais contourner un problème. Il faut le résoudre proprement.

## Stack technique

- **Frontend**: React 19, Vite 6, shadcn/ui, TailwindCSS, TypeScript 5.6, Bun, Recharts
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2, Pydantic 2
- **Database**: PostgreSQL (externe sur `sql:5432`)
- **Auth**: Pangolin SSO via headers HTTP (Remote-User, Remote-Email, Remote-Name)
- **Analytics**: Système de tracking intégré (fingerprint anonymise, sessions, events, recherches)

## Structure du projet

```
.
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui (tabs, card, button, etc.)
│   │   │   ├── item/           # 14 composants affichage items
│   │   │   ├── npc/            # 6 composants affichage NPCs
│   │   │   ├── compendium/     # 6 composants affichage Compendium
│   │   │   ├── dialogue/       # 2 composants affichage Dialogues
│   │   │   ├── admin/          # 5 composants dashboard analytics
│   │   │   ├── Header.tsx
│   │   │   ├── SearchPanel.tsx # Recherche avec debounce
│   │   │   └── PageTransition.tsx
│   │   ├── contexts/           # AuthContext, AnalyticsContext
│   │   ├── pages/              # HomePage, ItemPage, NPCPage, CompendiumPage, DialoguePage, AdminPage
│   │   ├── services/           # api.ts, analytics.ts, fingerprint.ts
│   │   ├── types/              # Types complets (~280 lignes)
│   │   ├── hooks/              # useItemLink
│   │   └── lib/                # utils, enumLabels, icons (getIconUrl)
│   ├── Dockerfile              # Multi-stage Bun + Nginx
│   └── nginx.conf
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py         # GET /auth/me
│   │   │   ├── items.py        # GET /items/{row_id}, /items/search
│   │   │   ├── npcs.py         # GET /npcs/{row_id}, /npcs/search, /npcs/list
│   │   │   ├── compendium.py   # GET /compendium/{row_id}, /compendium/search
│   │   │   ├── dialogues.py    # GET /dialogues/{row_id}, /dialogues/search, /dialogues/by-npc
│   │   │   ├── search.py       # GET /search (recherche unifiee)
│   │   │   └── analytics.py    # POST /analytics/session, /events, /search, dashboard endpoints
│   │   ├── models/             # 25 modèles ORM (incluant analytics)
│   │   ├── services/           # fingerprint.py (hash anonymise)
│   │   ├── schemas/            # Pydantic responses
│   │   ├── auth.py             # Extraction headers Pangolin
│   │   ├── config.py           # Settings
│   │   └── main.py
│   └── requirements.txt
├── data/
│   ├── icons/                  # Icones PNG originales (1309 fichiers)
│   ├── icons-webp/             # Icones WebP optimisees (10472 fichiers, genere)
│   └── GUI/                    # Images NPC, Compendium, traductions
├── scripts/
│   ├── extract_dialogue_mapping.py
│   └── convert_icons_webp_magick.sh  # Conversion PNG→WebP multi-tailles
├── .github/workflows/          # CI/CD docker.yml
└── docker-compose.yml
```

## Modèles de données

**Backend (SQLAlchemy)**: User, Item, Weapon, Equipment, Consumable, Deployable, Recipe, RecipeIngredient, ItemUpgrade, Salvage, SalvageDrop, Bench, NPC, NpcLootTable, Plant, Projectile, Buff, CompendiumEntry, CompendiumSection, CompendiumRecipeUnlock, NpcConversation, DialogueLine, DialogueUnlock, AnalyticsSession, AnalyticsEvent, AnalyticsSearch, AnalyticsPerformance, AnalyticsDailyStat

**Enums Dialogues**: DialogueLineType (Normal, Choice, Action, System), DialogueUnlockType (Quest, Item, Reputation, Event)

**Enums Analytics**: DeviceType (desktop, mobile, tablet, unknown), EventType (page_view, search, click, etc.), PerformanceMetricType (lcp, fcp, cls, fid, inp, ttfb, api_latency, etc.)

**Frontend (TypeScript)**: Types miroir + relations inverses (UsedInRecipe, UsedInUpgrade, UpgradedFrom) + chaines de transformation (upgrade_chain, cooking_chain)

## API Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/auth/me | Utilisateur connecte |
| GET | /api/items/{row_id} | Detail item complet avec relations |
| GET | /api/items/search?q= | Recherche items (max 20 résultats) |
| GET | /api/npcs/{row_id} | Detail NPC complet avec loot tables |
| GET | /api/npcs/search?q= | Recherche NPCs (max 20 résultats) |
| GET | /api/npcs/list | Liste NPCs avec pagination |
| GET | /api/compendium/{row_id} | Detail entrée Compendium avec sections |
| GET | /api/compendium/search?q= | Recherche Compendium (max 20 résultats) |
| GET | /api/compendium/list | Liste Compendium avec pagination |
| GET | /api/compendium/categories | Categories avec compteurs |
| GET | /api/compendium/by-npc/{npc_row_id} | Entrée Compendium liée à un NPC |
| GET | /api/dialogues/{row_id} | Detail dialogue avec lignes et unlocks |
| GET | /api/dialogues/search?q= | Recherche dialogues (max 20 résultats) |
| GET | /api/dialogues/list | Liste dialogues avec pagination |
| GET | /api/dialogues/by-npc/{npc_row_id} | Dialogues lies a un NPC |
| GET | /api/dialogues/by-name/{npc_name} | Dialogues par nom de NPC |
| POST | /api/analytics/session | Init/récupère session visiteur |
| POST | /api/analytics/events | Batch d'événements |
| POST | /api/analytics/search | Événement recherche |
| POST | /api/analytics/performance | Métriques Web Vitals |
| POST | /api/analytics/auth | Auth dashboard admin |
| GET | /api/analytics/dashboard | KPIs globaux (protégé) |
| GET | /api/analytics/dashboard/searches | Stats recherches (protégé) |
| GET | /api/analytics/dashboard/visitors | Stats visiteurs (protégé) |
| GET | /api/analytics/dashboard/performance | Stats performance (protégé) |
| GET | /api/analytics/dashboard/timeseries | Séries temporelles (protégé) |

Tu as le droit de tester l'api sur l'url de prod : https://abioticscience.fr/

## Logique de recherche

- Normalisation: accents (NFD), ligatures (oe->oe), points (F.O.R.G.E.->FORGE)
- Recherche sur nom OU description (case-insensitive)
- Priorite: correspondances nom > ordre alphabetique
- Frontend debounce: 300ms

## Composants item

`ItemHeader`, `ItemBaseStats`, `WeaponStats`, `EquipmentStats`, `ConsumableStats`, `DeployableStats`, `ItemRecipes`, `ItemSalvage`, `ItemUpgrades`, `ItemUsedInRecipes`, `ItemUsedInUpgrades`, `ItemUpgradedFrom`, `TransformationChain`

## Composants NPC

`NPCHeader`, `NPCCombatStats`, `NPCResistances`, `NPCBehavior`, `NPCLootTables`, `NPCDialogues`

## Composants Compendium

`CompendiumHeader`, `CompendiumSections`, `CompendiumKillRequirement`, `CompendiumRecipeUnlocks`, `CompendiumLoreCard`, `CompendiumDialogues`

Categories: Entity (creatures), IS (items speciaux), People (personnages), Location (lieux), Theories

## Composants Dialogue

`DialogueHeader`, `DialogueLines`

Types de lignes: Normal, Choice, Action, System

## Composants Admin (Analytics Dashboard)

`AdminLogin`, `DashboardOverview`, `SearchesChart`, `VisitorsChart`, `PerformanceChart`

Page accessible via `/admin`, protégée par mot de passe (défaut: "admin", configurable via `ANALYTICS_PASSWORD`)

## Assets statiques

| Route | Source | Description |
|-------|--------|-------------|
| /icons-webp/ | data/icons-webp/ | Icones WebP optimisees (8 tailles par icone) |
| /icons/ | data/icons/ | Icones PNG originales (fallback) |
| /npc-icons/ | data/GUI/Compendium/Entries/ | Images NPCs du Compendium |
| /compendium/ | data/GUI/Compendium/Entries/ | Images Compendium (167) |

## Optimisation des images

Les icones sont servies en WebP avec tailles pixel-perfect via `getIconUrl(path, size)` :

| Taille | Utilisation |
|--------|-------------|
| 80 | ItemHeader |
| 56 | TransformationChain |
| 48 | GalleryItemCard |
| 40 | HomePage search results |
| 32 | SearchPanel, ItemUpgrades output, EquipmentStats |
| 24 | ItemRecipes, ItemSalvage, NPCLootTables |
| 20 | WeaponStats |

Pour regenerer les WebP : `./scripts/convert_icons_webp_magick.sh`

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

## Accès Base de données

**IMPORTANT** : L'accès à PostgreSQL est préconfiguré via les variables d'environnement du système. La commande `psql` fonctionne directement sans arguments.

```bash
# Connexion directe (fonctionne tel quel, ne pas chercher à configurer)
psql

# Exemples de requêtes
psql -c "SELECT COUNT(*) FROM items;"
psql -c "\dt"  # Lister les tables
```

Ne jamais supposer que l'accès est impossible. Si une erreur survient, verifier d'abord avec `psql -c "\conninfo"`.

## Accès Production

```bash
# Serveur de production
ssh cadence
```

**Chemins sur le serveur:**
- `/home/share/docker` : dossiers de volumes Docker
- `/home/share/docker/dockge/stacks` : stacks docker-compose

## Configuration Analytics

Variables d'environnement (backend):
- `ANALYTICS_ENABLED`: Active/desactive le tracking (défaut: true)
- `ANALYTICS_SALT`: Sel pour anonymisation des fingerprints (changer en production)
- `ANALYTICS_PASSWORD`: Mot de passe dashboard admin (défaut: "admin", changer en production)
- `ANALYTICS_SESSION_TIMEOUT_HOURS`: Duree de validite d'une session (défaut: 24h)

## Performance

- **Code splitting**: Pages lazy-loaded via `React.lazy()` (ItemPage, NPCPage, etc.)
- **Animations CSS**: Remplace Motion.js par animations Tailwind (`animate-page-enter`, `animate-content-enter`)
- **SSR crawlers-only**: Nginx sert SSR uniquement aux bots (Googlebot, Twitterbot, etc.)
- **Chunks Vite**: `vendor-recharts`, `vendor-radix`, `vendor-react` separes

## CI/CD

GitHub Actions: push tag `v*` -> build images -> push ghcr.io -> release GitHub
