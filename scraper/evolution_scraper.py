import re
import time
import requests
from bs4 import BeautifulSoup
from rdflib import Graph, Namespace, RDFS, OWL

POKEDEX = Namespace("http://www.uni-bremen.de/akr/pokedex#")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Educational Project; University of Bremen AKR Course)"
}
CRAWL_DELAY = 1.5
MAX_NATIONAL_NUMBER = 386  # Gen 1-3 only

EVOLUTION_PAGES = {
    "https://pokemondb.net/evolution/level": "LevelUp",
    "https://pokemondb.net/evolution/stone": "UseStone",
    "https://pokemondb.net/evolution/trade": "Trade",
    "https://pokemondb.net/evolution/friendship": "Friendship",
}

NUM_RE = re.compile(r"#(\d+)")


def fetch_page(url: str) -> BeautifulSoup:
    print(f"  Fetching {url} ...")
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    time.sleep(CRAWL_DELAY)
    return BeautifulSoup(response.text, "html.parser")


def to_pokemon_iri(name: str) -> str:
    clean = name.replace("\u2640", "F").replace("\u2642", "M")
    clean = re.sub(r"[^a-zA-Z0-9]", "", clean)
    return clean[0].upper() + clean[1:] if clean else clean


def extract_name_and_number(cell):
    link = cell.find("a", class_="ent-name")
    if not link:
        return None, None
    name = link.get_text(strip=True)
    title = link.get("title", "")
    match = NUM_RE.search(title)
    number = int(match.group(1)) if match else None
    return name, number


def scrape_evolution_page(url: str, method_name: str, graph: Graph) -> int:
    soup = fetch_page(url)
    method_iri = POKEDEX[method_name]
    count = 0
    skipped_out_of_scope = 0
    skipped_no_link = 0

    table = soup.find("table", id="evolution")
    if not table:
        print(f"  WARNUNG: Keine Tabelle mit id='evolution' gefunden auf {url}.")
        return 0

    rows = table.find("tbody").find_all("tr")
    print(f"  {len(rows)} Zeilen in der Tabelle gefunden.")

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 3:
            continue

        from_name, from_num = extract_name_and_number(cells[0])
        to_name, to_num = extract_name_and_number(cells[2])

        if not from_name or not to_name:
            skipped_no_link += 1
            continue

        if from_num is None or to_num is None:
            skipped_no_link += 1
            continue

        if from_num > MAX_NATIONAL_NUMBER or to_num > MAX_NATIONAL_NUMBER:
            skipped_out_of_scope += 1
            continue

        from_iri = POKEDEX[to_pokemon_iri(from_name)]
        to_iri = POKEDEX[to_pokemon_iri(to_name)]

        graph.add((from_iri, POKEDEX.evolvesTo, to_iri))
        graph.add((to_iri, POKEDEX.evolvesFrom, from_iri))
        graph.add((from_iri, POKEDEX.hasEvolutionMethod, method_iri))
        count += 1
        print(f"    #{from_num:>3} {from_name} --[{method_name}]--> #{to_num:>3} {to_name}")

    print(f"  -> {count} Evolutionen im Scope, "
          f"{skipped_out_of_scope} außerhalb Gen 1-3 übersprungen, "
          f"{skipped_no_link} Zeilen ohne verwertbaren Link übersprungen.")
    return count


def main():
    print("=" * 60)
    print("Pokémon Evolution Chain Scraper (pokemondb.net) v2")
    print(f"Scope: Generation 1-3 (national # <= {MAX_NATIONAL_NUMBER})")
    print("=" * 60)

    g = Graph()
    g.bind("", POKEDEX)
    g.bind("owl", OWL)
    g.bind("rdfs", RDFS)

    total = 0
    for url, method in EVOLUTION_PAGES.items():
        print(f"\nScraping method: {method}")
        try:
            total += scrape_evolution_page(url, method, g)
        except requests.RequestException as e:
            print(f"  FEHLER beim Laden von {url}: {e}")

    output_path = "pokedex_evolutions.ttl"
    g.serialize(destination=output_path, format="turtle")

    print("\n" + "=" * 60)
    print(f"Fertig. {total} Evolution-Beziehungen (Gen 1-3) gefunden.")
    print(f"Output: {output_path} ({len(g)} Triples)")
    print("=" * 60)


if __name__ == "__main__":
    main()