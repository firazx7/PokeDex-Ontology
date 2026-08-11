import re
import time
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://pokemondb.net/pokedex/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AKR-Coursework-Scraper/1.0)"}

# Wiederverwendung der Slug-Sonderfaelle aus dem Abilities-Scraper
SLUG_OVERRIDES = {
    "Farfetch'd": "farfetchd",
    "Ho-oh": "ho-oh",
    "Mr.-mime": "mr-mime",
    "Nidoranfe": "nidoran-f",
    "Nidoranma": "nidoran-m",
}


def to_slug(iri_name: str) -> str:
    if iri_name in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[iri_name]
    slug = iri_name.lower()
    slug = slug.replace(".", "")
    slug = slug.replace("'", "")
    slug = slug.replace(" ", "-")
    return slug


def to_move_iri_from_slug(move_slug: str) -> str:
    """Wandelt einen pokemondb.net Move-Slug (z.B. 'poison-powder', 'solar-beam',
    '10000000-volt-thunderbolt') in den gleichen IRI-Namen um, den move_list_scraper.py
    aus dem Move-Namen erzeugt (z.B. 'PoisonPowder', 'SolarBeam', '10000000VoltThunderbolt').

    Wichtig: auf den Pokemon-Lernset-Seiten schreibt pokemondb.net manche Move-Namen
    ohne Leerzeichen zusammen (z.B. "PoisonPowder", "SolarBeam"), waehrend die
    Move-Uebersichtsliste (move_list_scraper.py) sie korrekt mit Leerzeichen zeigt
    ("Poison Powder", "Solar Beam"). Der URL-Slug ist in beiden Faellen konsistent
    mit Bindestrichen getrennt, daher wird der IRI hier aus dem Slug abgeleitet statt
    aus dem sichtbaren Text -- das stellt exakte Uebereinstimmung mit move_list_scraper.py sicher.
    """
    parts = move_slug.split("-")
    iri = "".join(p.capitalize() for p in parts)
    if iri and iri[0].isdigit():
        iri = "M" + iri
    return iri


def to_move_iri(move_name: str) -> str:
    """Fallback falls kein Slug verfuegbar ist (sollte im Normalfall nicht gebraucht werden)."""
    cleaned = re.sub(r"[^A-Za-z0-9 ]", " ", move_name)
    parts = cleaned.split()
    return "".join(p.capitalize() for p in parts)


def scrape_learnsets(pokemon_names: list[str], delay: float = 1.0) -> dict:
    """
    Returns: dict {pokemon_iri_name: [(level, move_name), ...]}
    """
    results = {}
    errors = []

    for i, name in enumerate(pokemon_names, 1):
        slug = to_slug(name)
        url = f"{BASE_URL}{slug}/moves/3"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as e:
            errors.append((name, slug, str(e)))
            print(f"[{i}/{len(pokemon_names)}] FEHLER bei {name} ({slug}): {e}")
            time.sleep(delay)
            continue

        soup = BeautifulSoup(resp.text, "html.parser")

        tabset = soup.find("div", class_="tabset-moves-game")
        if tabset is None:
            # Manche Pokemon (z.B. reine Gen-1/2-exklusive Formen) haben evtl.
            # keine versionsspezifischen Tabs -- dann gibt es nur eine Tabelle direkt.
            errors.append((name, slug, "kein tabset-moves-game gefunden"))
            print(f"[{i}/{len(pokemon_names)}] WARNUNG: kein Tabset bei {name} ({slug})")
            time.sleep(delay)
            continue

        tab_list = tabset.find("div", class_="sv-tabs-tab-list")
        emerald_link = None
        if tab_list:
            for a in tab_list.find_all("a", class_="sv-tabs-tab"):
                if "Emerald" in a.get_text():
                    emerald_link = a
                    break

        panel = None
        if emerald_link and emerald_link.get("href", "").startswith("#"):
            panel_id = emerald_link["href"][1:]
            panel = tabset.find("div", id=panel_id)
        else:
            # Fallback: nur ein Tab vorhanden (kein Emerald-spezifischer Link) ->
            # einzigen Panel nehmen, falls genau einer existiert
            panels = tabset.find_all("div", class_="sv-tabs-panel")
            if len(panels) == 1:
                panel = panels[0]

        if panel is None:
            errors.append((name, slug, "kein Emerald-Panel gefunden"))
            print(f"[{i}/{len(pokemon_names)}] WARNUNG: kein Emerald-Panel bei {name} ({slug})")
            time.sleep(delay)
            continue

        # Innerhalb des Panels: die Tabelle unter der Ueberschrift "Moves learnt by level up"
        levelup_heading = None
        for h3 in panel.find_all("h3"):
            if "level up" in h3.get_text().lower():
                levelup_heading = h3
                break

        learnset = []
        if levelup_heading:
            table = levelup_heading.find_next("table", class_="data-table")
            if table:
                tbody = table.find("tbody")
                for row in tbody.find_all("tr", recursive=False):
                    cells = row.find_all("td", recursive=False)
                    if len(cells) < 2:
                        continue
                    level_text = cells[0].get_text(strip=True)
                    a_move = cells[1].find("a", class_="ent-name")
                    if not a_move:
                        continue
                    move_name = a_move.get_text(strip=True)
                    slug_match = re.search(r"/move/([^/\"]+)", a_move.get("href", ""))
                    move_slug = slug_match.group(1) if slug_match else None
                    try:
                        level = int(level_text)
                    except ValueError:
                        level = 0  # z.B. "Evo"/"—" fuer Start-Moves nach Entwicklung
                    learnset.append((level, move_name, move_slug))

        if not learnset:
            errors.append((name, slug, "leeres Lernset (Level-Up-Tabelle nicht gefunden oder leer)"))
            print(f"[{i}/{len(pokemon_names)}] WARNUNG: leeres Lernset bei {name} ({slug})")
        else:
            print(f"[{i}/{len(pokemon_names)}] {name}: {len(learnset)} Level-Up-Moves")

        results[name] = learnset
        time.sleep(delay)

    print(f"\nFertig. {len(errors)} Fehler/Warnungen von {len(pokemon_names)}.")
    if errors:
        print("Details:")
        for nm, sl, msg in errors:
            print(f"  - {nm} ({sl}): {msg}")

    return results


def write_ttl(results: dict, output_path: str):
    lines = [
        "@prefix : <http://www.uni-bremen.de/akr/pokedex#> .",
        "",
    ]

    node_counter = 0
    for pokemon_name, learnset in results.items():
        for level, move_name, move_slug in learnset:
            move_iri = to_move_iri_from_slug(move_slug) if move_slug else to_move_iri(move_name)
            node_counter += 1
            blank_node = f"_:lm{node_counter}"
            lines.append(f':{pokemon_name} :learnsMove {blank_node} .')
            lines.append(f'{blank_node} a :LearnedMove ;')
            lines.append(f'    :ofMove :{move_iri} ;')
            lines.append(f'    :learnLevel {level} .')

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    total_triples_approx = node_counter * 4
    print(f"\nTTL geschrieben nach {output_path}")
    print(f"{node_counter} LearnedMove-Knoten (~{total_triples_approx} Triples).")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Nutzung: python moveset_scraper.py pokemon_names.txt")
        sys.exit(1)

    with open(sys.argv[1], encoding="utf-8") as f:
        POKEMON_NAMES = [line.strip() for line in f if line.strip()]

    results = scrape_learnsets(POKEMON_NAMES, delay=1.0)
    write_ttl(results, "pokedex_movesets.ttl")