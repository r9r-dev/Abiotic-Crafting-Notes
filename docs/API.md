# API Reference

Base URL: `/api`

## Authentification

L'authentification est geree par Pangolin via les headers HTTP:
- `Remote-User`: ID utilisateur unique
- `Remote-Email`: Email de l'utilisateur
- `Remote-Name`: Nom affiche

En mode developpement (`DEV_MODE=true`), un utilisateur fictif est utilise.

## Endpoints

### Auth

#### GET /api/auth/me
Retourne l'utilisateur courant.

**Response:**
```json
{
  "id": "user-123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:00:00Z"
}
```

### Recipes

#### GET /api/recipes
Liste et recherche de recettes.

**Query params:**
- `q` (string): Recherche par nom
- `category` (string): Filtre par categorie

**Response:**
```json
[
  {
    "id": "crafting_bench",
    "name": "Crafting Bench",
    "icon_url": "https://...",
    "category": "Furniture and Benches",
    "craftable": true
  }
]
```

#### GET /api/recipes/categories
Liste toutes les categories.

**Response:**
```json
["Furniture and Benches", "Tools", "Weapons and Ammo"]
```

#### GET /api/recipes/{item_id}
Details d'une recette.

**Response:**
```json
{
  "id": "crafting_bench",
  "name": "Crafting Bench",
  "icon_url": "https://...",
  "category": "Furniture and Benches",
  "weight": 30,
  "stack_size": 1,
  "durability": 1500,
  "variants": [
    {
      "ingredients": [
        {"item_id": "duct_tape", "item_name": "Duct Tape", "quantity": 4}
      ],
      "station": null
    }
  ],
  "wiki_url": "https://abioticfactor.wiki.gg/wiki/Crafting_Bench"
}
```

#### GET /api/recipes/{item_id}/dependencies
Arbre de dependances recursif.

**Query params:**
- `quantity` (int): Quantite a crafter (default: 1)

**Response:**
```json
{
  "item_id": "crafting_bench",
  "item_name": "Crafting Bench",
  "quantity": 1,
  "craftable": true,
  "children": [
    {
      "item_id": "duct_tape",
      "item_name": "Duct Tape",
      "quantity": 4,
      "craftable": false,
      "children": []
    }
  ]
}
```

#### GET /api/recipes/{item_id}/resources
Calcul des ressources de base.

**Query params:**
- `quantity` (int): Quantite a crafter (default: 1)

**Response:**
```json
[
  {
    "item_id": "metal_scrap",
    "item_name": "Metal Scrap",
    "total_quantity": 10,
    "is_base_resource": true
  }
]
```

### Orders

#### GET /api/orders
Liste des commandes.

**Query params:**
- `status` (string): Filtre par statut
- `mine` (bool): Mes commandes uniquement
- `assigned` (bool): Commandes qui me sont assignees

**Response:**
```json
[
  {
    "id": 1,
    "requester_id": "user-123",
    "requester_name": "John",
    "crafter_id": null,
    "crafter_name": null,
    "status": "pending",
    "notes": null,
    "missing_resources": null,
    "items": [
      {"id": 1, "item_id": "crafting_bench", "quantity": 2}
    ],
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
]
```

#### POST /api/orders
Creer une commande.

**Body:**
```json
{
  "items": [
    {"item_id": "crafting_bench", "quantity": 2}
  ],
  "notes": "Pour la base principale"
}
```

#### GET /api/orders/{order_id}
Details d'une commande.

#### PATCH /api/orders/{order_id}
Modifier une commande.

**Body:**
```json
{
  "status": "in_progress",
  "notes": "Mise a jour",
  "missing_resources": [
    {"item_id": "metal_scrap", "item_name": "Metal Scrap", "quantity_needed": 5}
  ]
}
```

#### POST /api/orders/{order_id}/accept
Accepter une commande (s'assigner comme crafter).

#### POST /api/orders/{order_id}/complete
Marquer une commande comme terminee.

#### POST /api/orders/{order_id}/cancel
Annuler une commande (requester uniquement).

### Health

#### GET /api/health
Health check pour le proxy.

**Response:**
```json
{"status": "ok"}
```
