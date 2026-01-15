# Database Schema

## PostgreSQL

Host: `sql` (reseau docker cadence)
Database: `abiotic`

## Tables

### users

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR (PK) | ID depuis Pangolin SSO |
| email | VARCHAR | Email utilisateur |
| name | VARCHAR | Nom affiche |
| created_at | TIMESTAMP | Date creation |
| updated_at | TIMESTAMP | Date mise a jour |

### orders

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | ID auto-incremente |
| requester_id | VARCHAR (FK) | -> users.id |
| crafter_id | VARCHAR (FK, nullable) | -> users.id |
| status | ENUM | pending, accepted, in_progress, missing_resources, completed, cancelled |
| notes | TEXT (nullable) | Notes/instructions |
| missing_resources | JSON (nullable) | [{item_id, item_name, quantity_needed}] |
| created_at | TIMESTAMP | Date creation |
| updated_at | TIMESTAMP | Date mise a jour |

### order_items

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL (PK) | ID auto-incremente |
| order_id | INTEGER (FK) | -> orders.id |
| item_id | VARCHAR | Reference au recipes.json |
| quantity | INTEGER | Quantite demandee |

## Relations

```
users 1──┬──N orders (requester)
         └──N orders (crafter)

orders 1────N order_items
```

## Migrations

Les tables sont creees automatiquement via SQLAlchemy au demarrage du backend:
```python
Base.metadata.create_all(bind=engine)
```

Pour des migrations plus complexes, utiliser Alembic (deja en dependance).
