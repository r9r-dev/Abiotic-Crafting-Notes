# Abiotic Crafting Notes

Carnet de commandes collaboratif pour le jeu Abiotic Factor.

## Documentation

- [Manuel d'utilisation](docs/USER_MANUAL.md)
- [Guide de deploiement](docs/DEPLOYMENT.md)
- [API Reference](docs/API.md)

## Developpement rapide

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
DEV_MODE=true uvicorn app.main:app --reload --port 8080

# Frontend (autre terminal)
cd frontend
bun install
bun dev
```

## Deploiement

```bash
cp .env.example .env
# Editer .env avec vos credentials
docker compose up -d
```

## Stack

- **Frontend**: React 19, Vite, shadcn/ui, TailwindCSS
- **Backend**: Python 3.12, FastAPI, SQLAlchemy
- **Database**: PostgreSQL
- **Auth**: Pangolin SSO (headers Remote-User/Email/Name)
