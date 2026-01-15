# Guide de deploiement

## Prerequis

- Docker et Docker Compose
- Acces a un serveur PostgreSQL
- Reverse proxy configure (Pangolin, Caddy, nginx, etc.)

## Images Docker

Les images sont publiees automatiquement sur GitHub Container Registry lors d'un tag:

- `ghcr.io/r9r-dev/abiotic-crafting-notes-frontend:latest`
- `ghcr.io/r9r-dev/abiotic-crafting-notes-backend:latest`

### Creer une release

```bash
git tag v1.0.0
git push origin v1.0.0
```

La CI GitHub va automatiquement:
1. Builder les images frontend et backend
2. Les pousser sur ghcr.io
3. Creer une release GitHub

## Configuration

1. Copier le fichier d'environnement:
```bash
cp .env.example .env
```

2. Editer `.env` avec vos credentials PostgreSQL:
```bash
POSTGRES_USER=votre_user
POSTGRES_PASSWORD=votre_password
```

## Deploiement

### Production

```bash
docker compose up -d
```

Le frontend sera accessible sur le port 80 du container `abiotic-frontend`.

### Developpement local

```bash
docker compose -f docker-compose.dev.yml up -d
```

Ceci demarre:
- Backend sur http://localhost:8080
- PostgreSQL local sur localhost:5432

Pour le frontend en mode dev:
```bash
cd frontend
bun install
bun dev
```

Frontend accessible sur http://localhost:3000

## Configuration Pangolin

Ajouter ces labels au service dans votre configuration Pangolin:

```yaml
labels:
  pangolin.proxy-resources.abiotic.name: abiotic-crafting
  pangolin.proxy-resources.abiotic.full-domain: abiotic.hellonowork.com
  pangolin.proxy-resources.abiotic.protocol: http
  pangolin.proxy-resources.abiotic.ssl: true
  pangolin.proxy-resources.abiotic.auth.sso-enabled: true
  pangolin.proxy-resources.abiotic.targets[0].method: http
  pangolin.proxy-resources.abiotic.targets[0].hostname: abiotic-frontend
  pangolin.proxy-resources.abiotic.targets[0].port: 80
  pangolin.proxy-resources.abiotic.targets[0].healthcheck.enabled: true
  pangolin.proxy-resources.abiotic.targets[0].healthcheck.hostname: abiotic-backend
  pangolin.proxy-resources.abiotic.targets[0].healthcheck.port: 8080
  pangolin.proxy-resources.abiotic.targets[0].healthcheck.path: /api/health
```

## Initialisation des recettes

Pour importer les recettes depuis le wiki:

```bash
# Dans le container backend ou en local
python -m scraper.wiki_scraper
```

Les recettes seront sauvegardees dans `data/recipes.json`.

## Structure de la base de donnees

Les tables sont creees automatiquement au demarrage du backend:

- `users` - Utilisateurs (depuis Pangolin SSO)
- `orders` - Commandes de crafting
- `order_items` - Items dans les commandes

## Logs

Les logs sont configures pour GELF (Graylog). Modifier le driver dans docker-compose.yml si necessaire:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```
