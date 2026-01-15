# Architecture

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                     Pangolin (SSO Proxy)                     │
│                  abiotic.hellonowork.com                     │
└─────────────────────────────────┬───────────────────────────┘
                                  │ Remote-User/Email/Name
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    abiotic-frontend                          │
│                      (nginx:80)                              │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  React SPA      │    │  /api/* → abiotic-backend:8080  │ │
│  │  (dist/)        │    │                                  │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    abiotic-backend                           │
│                    (uvicorn:8080)                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │
│  │ FastAPI    │  │ SQLAlchemy │  │ recipes.json (read)    │ │
│  │ Routes     │  │ ORM        │  │                        │ │
│  └────────────┘  └────────────┘  └────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│                    (sql:5432)                                │
│  Tables: users, orders, order_items                          │
└─────────────────────────────────────────────────────────────┘
```

## Composants

### Frontend (React)

- **Tech**: React 19, Vite, TypeScript, TailwindCSS, shadcn/ui
- **Pages**: Orders, Recipes, Calculator
- **Auth**: Recoit l'utilisateur depuis `/api/auth/me`
- **Build**: Multi-stage Docker (bun build -> nginx)

### Backend (FastAPI)

- **Tech**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Auth**: Parse les headers Pangolin (Remote-User/Email/Name)
- **Data**:
  - PostgreSQL pour users/orders
  - JSON file pour recipes (lu au demarrage)

### Database (PostgreSQL)

- Externe (deja existant sur l'infra)
- Host: `sql` (reseau docker cadence)
- Base: `abiotic`

## Flux d'authentification

1. User accede a abiotic.hellonowork.com
2. Pangolin intercepte, verifie SSO
3. Ajoute headers Remote-User/Email/Name
4. Frontend charge, appelle /api/auth/me
5. Backend parse headers, cree/update user en DB
6. Frontend recoit infos user

## Flux de commande

1. User selectionne items, quantites
2. POST /api/orders avec items[]
3. Commande creee avec status=pending
4. Autre user voit la commande, clique "Accepter"
5. POST /api/orders/{id}/accept
6. Commande passe a status=accepted, crafter_id assigne
7. Crafter termine, POST /api/orders/{id}/complete
8. status=completed
