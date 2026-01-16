# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.1.0] - 2025-01-16

### Added
- Table `items` en PostgreSQL (migration depuis JSON)
- Traductions francaises des noms d'items (710 officielles + 50 fallback EN)
- Descriptions francaises des items (724)
- Icones locales telechargees depuis le wiki (760 fichiers, 14 MB)
- Route `/api/icons/{item_id}.png` pour servir les icones
- Extensions PostgreSQL `unaccent` et `pg_trgm` pour la recherche
- Fonction `f_unaccent()` pour index de recherche sans accents

### Changed
- Recherche insensible aux accents et a la casse
- Recherche multi-champs (nom EN, nom FR, description FR)
- Frontend affiche les noms francais par defaut
- Icones servies localement au lieu du wiki

### Removed
- Dependance au fichier `recipes.json` (donnees en DB)
- Dossier `data/` retire du tracking git

## [v1.0.2] - 2025-01-15

### Added
- Logo Abiotic Factor dans le header (cliquable vers l'accueil)
- Favicon avec le logo du jeu

### Changed
- Augmenter le délai du scraper à 5s pour éviter le rate limiting

## [v1.0.1] - 2025-01-15

### Fixed
- Corriger tous les accents français dans l'interface
- Améliorer le responsive mobile (tabs, cartes, formulaires)
- Optimiser l'affichage des recettes sur petits écrans

## [v1.0.0] - 2025-01-15

### Added
- Initial release
- Order management system (create, accept, complete, cancel)
- Recipe search with category filtering
- Dependency tree visualization
- Resource calculator for multiple items
- Wiki scraper for Abiotic Factor recipes
- Pangolin SSO authentication support
- Docker deployment with ghcr.io images
