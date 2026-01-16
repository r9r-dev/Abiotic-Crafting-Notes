#!/usr/bin/env python3
"""Test du scraper sur quelques pages variées."""

from scraper.wiki_scraper import parse_item_page, item_to_dict, close_browser
import json

# Test sur quelques pages variées
test_items = [
    ('1057 Paint', 'https://abioticfactor.wiki.gg/wiki/1057_Paint'),  # Crafting multiple
    ('Desk Phone', 'https://abioticfactor.wiki.gg/wiki/Desk_Phone'),  # Ressource (Used In)
    ('Security Pistol', 'https://abioticfactor.wiki.gg/wiki/Security_Pistol'),  # Arme avec upgrading
    ('Pipe Wrench', 'https://abioticfactor.wiki.gg/wiki/Pipe_Wrench'),  # Outil avec durabilité
]

print("=" * 60)
print("Test du scraper Abiotic Factor Wiki")
print("Un navigateur va s'ouvrir. Si CloudFlare apparaît,")
print("résolvez le captcha dans la fenêtre du navigateur.")
print("=" * 60)

try:
    for name, url in test_items:
        print(f'\n{"="*60}')
        print(f'Testing: {name}')
        print('='*60)

        item = parse_item_page(name, url)
        if item:
            d = item_to_dict(item)
            print(json.dumps(d, indent=2, ensure_ascii=False))
        else:
            print('FAILED to parse')
finally:
    close_browser()

print('\n\nTest complete!')
