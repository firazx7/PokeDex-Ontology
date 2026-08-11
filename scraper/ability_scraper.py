import re
import time
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://pokemondb.net/pokedex/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AKR-Coursework-Scraper/1.0)"}

# Sonderfaelle: IRI-Name -> pokemondb.net URL-Slug
SLUG_OVERRIDES = {
    "Farfetch'd": "farfetchd",
    "Ho-oh": "ho-oh",
    "Mr.-mime": "mr-mime",
}


def to_slug(iri_name: str) -> str:
    """Wandelt einen Ontologie-IRI-Namen in den pokemondb.net URL-Slug um."""
    if iri_name in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[iri_name]
    slug = iri_name.lower()
    slug = slug.replace(".", "")
    slug = slug.replace("'", "")
    slug = slug.replace(" ", "-")
    return slug


def to_ability_iri(ability_name: str) -> str:
    """Wandelt einen Ability-Namen (z.B. 'Overgrow', 'Sand Veil') in einen
    IRI-Namen um (PascalCase ohne Leerzeichen/Sonderzeichen)."""
    cleaned = re.sub(r"[^A-Za-z0-9 ]", "", ability_name)
    parts = cleaned.split()
    return "".join(p.capitalize() for p in parts)


def scrape_abilities(pokemon_names: list[str], delay: float = 1.0) -> dict:
    """
    Returns: dict {pokemon_iri_name: {"regular": [ability_names], "hidden": [ability_names]}}
    """
    results = {}
    errors = []

    for i, name in enumerate(pokemon_names, 1):
        slug = to_slug(name)
        url = BASE_URL + slug
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            errors.append((name, slug, str(e)))
            print(f"[{i}/{len(pokemon_names)}] FEHLER bei {name} ({slug}): {e}")
            time.sleep(delay)
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        # Finde die "Abilities"-Zeile in der vitals-table
        abilities_row = None
        for th in soup.select("table.vitals-table th"):
            if th.get_text(strip=True) == "Abilities":
                abilities_row = th.find_next_sibling("td")
                break

        regular_abilities = []
        hidden_abilities = []

        if abilities_row:
            # Normale Abilities: <span class="text-muted">N. <a href="/ability/X">Name</a></span>
            for span in abilities_row.select("span.text-muted"):
                a_tag = span.find("a")
                if a_tag:
                    regular_abilities.append(a_tag.get_text(strip=True))

            # Hidden Ability: <small class="text-muted"><a href="/ability/X">Name</a> (hidden ability)</small>
            for small in abilities_row.select("small.text-muted"):
                text = small.get_text()
                if "hidden ability" in text.lower():
                    a_tag = small.find("a")
                    if a_tag:
                        hidden_abilities.append(a_tag.get_text(strip=True))

        if not regular_abilities and not hidden_abilities:
            errors.append((name, slug, "keine Abilities-Zeile gefunden"))
            print(f"[{i}/{len(pokemon_names)}] WARNUNG: keine Abilities gefunden fuer {name} ({slug})")
        else:
            print(f"[{i}/{len(pokemon_names)}] {name}: regular={regular_abilities}, hidden={hidden_abilities}")

        results[name] = {"regular": regular_abilities, "hidden": hidden_abilities}
        time.sleep(delay)

    print(f"\nFertig. {len(errors)} Fehler/Warnungen von {len(pokemon_names)}.")
    if errors:
        print("Details:")
        for name, slug, msg in errors:
            print(f"  - {name} ({slug}): {msg}")

    return results


def write_ttl(results: dict, output_path: str):
    """Schreibt die gescrapten Ability-Daten als TTL-Datei.
    Ability-Individuen werden ebenfalls definiert (rdf:type :Ability via dul:Concept-Mapping
    geschieht schon in der TBox -- hier nur die Individuen + hasAbility/hasHiddenAbility Links).
    """
    all_abilities = set()
    lines = ['@prefix : <http://www.uni-bremen.de/akr/pokedex#> .', '']

    for pokemon_name, data in results.items():
        for ability_name in data["regular"]:
            ability_iri = to_ability_iri(ability_name)
            all_abilities.add((ability_iri, ability_name))
            lines.append(f':{pokemon_name} :hasAbility :{ability_iri} .')
        for ability_name in data["hidden"]:
            ability_iri = to_ability_iri(ability_name)
            all_abilities.add((ability_iri, ability_name))
            lines.append(f':{pokemon_name} :hasHiddenAbility :{ability_iri} .')

    lines.append('')
    lines.append('# Ability-Individuen mit rdfs:label')
    for ability_iri, ability_name in sorted(all_abilities):
        escaped_name = ability_name.replace('"', '\\"')
        lines.append(f':{ability_iri} a :Ability ; rdfs:label "{escaped_name}" .')

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\nTTL geschrieben nach {output_path}")
    print(f"Einzigartige Abilities gefunden: {len(all_abilities)}")


if __name__ == "__main__":
    # Liste der 386 Pokemon-IRI-Namen (aus der Hauptontologie exportiert)
    POKEMON_NAMES = []  # wird vom Nutzer befuellt / aus Datei geladen

    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            POKEMON_NAMES = [line.strip() for line in f if line.strip()]

    if not POKEMON_NAMES:
        print("Keine Pokemon-Namen geladen. Nutzung: python ability_scraper.py pokemon_names.txt")
        sys.exit(1)

    results = scrape_abilities(POKEMON_NAMES, delay=1.0)
    write_ttl(results, "pokedex_abilities.ttl")