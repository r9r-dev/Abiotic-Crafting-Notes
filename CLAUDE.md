# Abiotic Crafting Notes

`abiotic.hellonowork.com`

## Stack technique

- **Frontend**: React 19, Vite, shadcn/ui, TailwindCSS, TypeScript, Bun
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Database**: PostgreSQL (externe sur `sql:5432`)
- **Auth**: Pangolin SSO via headers HTTP (Remote-User, Remote-Email, Remote-Name)

## Structure du projet

```
.
├── frontend/
│   ├── src/
│   │   ├── components/     # Header, ui/*
│   │   ├── contexts/       # AuthContext
│   │   ├── pages/          # HomePage
│   │   ├── services/       # api.ts
│   │   ├── types/          # User
│   │   └── lib/            # utils
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── app/
│   │   ├── api/            # auth.py
│   │   ├── models/         # User
│   │   ├── schemas/        # user.py
│   │   └── main.py
│   └── requirements.txt
├── data/                   # Icons et donnees
└── docker-compose.yml
```

## API Endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/auth/me | Utilisateur connecte |
| GET | /api/health | Health check |

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

## Acces Production

```bash
# Base de donnees (variables d'env configurees)
# Ne pas hésiter à utiliser cette commande pour consulter les données de base de données
psql

# Serveur de production
ssh cadence
```

**Chemins sur le serveur :**
- `/home/share/docker` : dossiers de volumes Docker
- `/home/share/docker/dockge/stacks` : stacks docker-compose

## CI/CD

GitHub Actions: push tag `v*` -> build images -> push ghcr.io -> release GitHub
