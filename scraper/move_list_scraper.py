import re
import time
import requests
from bs4 import BeautifulSoup

URL = "https://pokemondb.net/move/all"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AKR-Coursework-Scraper/1.0)"}


def to_move_iri(move_name: str) -> str:
    """Fallback falls kein Slug verfuegbar ist."""
    cleaned = re.sub(r"[^A-Za-z0-9 ]", " ", move_name)
    parts = cleaned.split()
    return "".join(p.capitalize() for p in parts)


def to_move_iri_from_slug(move_slug: str) -> str:
    """Erzeugt den IRI-Namen aus dem URL-Slug (z.B. 'poison-powder' -> 'PoisonPowder').
    Wird bevorzugt verwendet, damit move_list_scraper.py und moveset_scraper.py garantiert
    dieselben IRIs fuer dasselbe Move erzeugen (der sichtbare Name ist auf den beiden
    Seitentypen nicht immer identisch geschrieben, der Slug aber schon).

    Turtle-Sonderfall: prefixed names duerfen nicht mit einer Ziffer beginnen
    (z.B. Z-Move-Slug '10000000-volt-thunderbolt'). In diesem Fall wird ein 'M'
    vorangestellt, analog zur Behandlung von Farfetch'd (Apostroph) im Abilities-Scraper."""
    parts = move_slug.split("-")
    iri = "".join(p.capitalize() for p in parts)
    if iri and iri[0].isdigit():
        iri = "M" + iri
    return iri


def parse_num_cell(text: str):
    """Parst eine cell-num-Zelle: '—' -> None, '∞' -> None (kein endlicher Wert),
    ansonsten int."""
    text = text.strip()
    if text in ("—", "", "\u221e", "&infin;"):
        return None
    try:
        return int(text)
    except ValueError:
        return None


def scrape_moves(delay: float = 0.0) -> list[dict]:
    print(f"Lade {URL} ...")
    resp = requests.get(URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    table = soup.find("table", id="moves")
    if table is None:
        raise RuntimeError("Konnte table#moves nicht finden -- Seitenstruktur hat sich evtl. geändert.")

    tbody = table.find("tbody")
    rows = tbody.find_all("tr", recursive=False)
    print(f"{len(rows)} Move-Zeilen gefunden.")

    moves = []
    skipped = []

    for row in rows:
        cells = row.find_all("td", recursive=False)
        if len(cells) < 8:
            skipped.append(("zu wenig Zellen", row.get_text(strip=True)[:50]))
            continue

        name_cell, type_cell, cat_cell, power_cell, acc_cell, pp_cell, effect_cell, prob_cell = cells[:8]

        a_name = name_cell.find("a", class_="ent-name")
        if not a_name:
            skipped.append(("kein ent-name Link", name_cell.get_text(strip=True)[:50]))
            continue
        move_name = a_name.get_text(strip=True)
        slug_match = re.search(r"/move/([^/\"]+)", a_name.get("href", ""))
        slug = slug_match.group(1) if slug_match else None

        a_type = type_cell.find("a", class_="type-icon")
        move_type = a_type.get_text(strip=True) if a_type else None

        category = cat_cell.get("data-filter-value", "").strip()
        if not category:
            # Z-Moves o.ä. ohne Kategorie -- ausserhalb des Scopes, ueberspringen
            skipped.append(("keine Kategorie (Z-Move?)", move_name))
            continue

        power = parse_num_cell(power_cell.get_text())
        accuracy = parse_num_cell(acc_cell.get_text())
        pp = parse_num_cell(pp_cell.get_text())
        effect = effect_cell.get_text(strip=True)
        # Probability-Zelle wird aktuell nicht in die TBox übernommen (kein passendes Property),
        # bleibt hier nur zur Vollständigkeit erfasst falls spaeter gebraucht.
        prob = parse_num_cell(prob_cell.get_text())

        moves.append({
            "name": move_name,
            "iri": to_move_iri_from_slug(slug) if slug else to_move_iri(move_name),
            "slug": slug,
            "type": move_type,
            "category": category,
            "power": power,
            "accuracy": accuracy,
            "pp": pp,
            "effect": effect,
            "prob": prob,
        })

        if delay:
            time.sleep(delay)

    print(f"\n{len(moves)} Moves erfolgreich geparst.")
    print(f"{len(skipped)} Zeilen übersprungen.")
    if skipped:
        print("Beispiele übersprungener Zeilen:")
        for reason, info in skipped[:10]:
            print(f"  - {reason}: {info}")

    return moves


def write_ttl(moves: list[dict], output_path: str):
    lines = [
        "@prefix : <http://www.uni-bremen.de/akr/pokedex#> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]

    # IRI-Namen müssen eindeutig sein -- pruefen und ggf. warnen
    seen_iris = {}
    for m in moves:
        seen_iris.setdefault(m["iri"], []).append(m["name"])
    duplicates = {k: v for k, v in seen_iris.items() if len(v) > 1}
    if duplicates:
        print("\nWARNUNG: doppelte IRI-Namen erkannt (kollidierende Moves):")
        for iri, names in duplicates.items():
            print(f"  {iri}: {names}")

    category_map = {
        "physical": "Physical",
        "special": "Special",
        "status": "Status",
    }

    for m in moves:
        escaped_label = m["name"].replace('"', '\\"')
        escaped_effect = m["effect"].replace('"', '\\"').replace("\n", " ")

        lines.append(f':{m["iri"]} a :Move ;')
        lines.append(f'    rdfs:label "{escaped_label}" ;')
        if m["type"]:
            lines.append(f'    :hasMoveType :{m["type"]} ;')
        cat_iri = category_map.get(m["category"])
        if cat_iri:
            lines.append(f'    :hasMoveCategory :{cat_iri} ;')
        if m["power"] is not None:
            lines.append(f'    :power {m["power"]} ;')
        if m["accuracy"] is not None:
            lines.append(f'    :accuracy {m["accuracy"]} ;')
        if m["pp"] is not None:
            lines.append(f'    :pp {m["pp"]} ;')
        if escaped_effect:
            lines.append(f'    :effectDescription "{escaped_effect}" ;')
        # letzte Zeile der Subjekt-Beschreibung: Punkt statt Semikolon
        lines[-1] = lines[-1].rstrip(" ;") + " ."
        lines.append("")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\nTTL geschrieben nach {output_path}")
    print(f"{len(moves)} Move-Individuen.")


if __name__ == "__main__":
    moves = scrape_moves()
    write_ttl(moves, "pokedex_moves.ttl")