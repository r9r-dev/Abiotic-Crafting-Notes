# SOP: Scraping du Wiki

## Quand mettre a jour

- Nouvelle version du jeu avec nouveaux items
- Corrections de recettes
- Ajout de categories

## Procedure

### 1. Executer le scraper

```bash
# En local
cd backend
python -m scraper.wiki_scraper

# Ou dans le container
docker exec -it abiotic-backend python -m scraper.wiki_scraper
```

### 2. Verifier le resultat

Le fichier `data/recipes.json` est mis a jour.

```bash
# Nombre de recettes
jq 'length' data/recipes.json

# Verifier une recette specifique
jq '.crafting_bench' data/recipes.json
```

### 3. Redemarrer le backend (si necessaire)

Le cache des recettes est en memoire. Pour forcer le rechargement:

```bash
docker restart abiotic-backend
```

## Structure du scraper

Le scraper (`backend/scraper/wiki_scraper.py`):

1. Parcourt les categories definies
2. Pour chaque categorie, liste les items
3. Pour chaque item, parse la page de detail
4. Extrait: nom, icone, poids, durabilite, recette
5. Sauvegarde en JSON

## Limitations connues

- Parsing HTML fragile (depend de la structure du wiki)
- Rate limiting: 0.5s entre chaque requete
- Certaines recettes complexes peuvent etre mal parsees

## Ajout manuel de recettes

Si le scraping echoue pour certains items, editer manuellement `data/recipes.json`:

```json
{
  "item_id": {
    "id": "item_id",
    "name": "Item Name",
    "icon_url": "https://...",
    "category": "Category",
    "variants": [
      {
        "ingredients": [
          {"item_id": "material_1", "item_name": "Material 1", "quantity": 2}
        ],
        "station": "Crafting Bench"
      }
    ]
  }
}
```
