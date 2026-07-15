# Pokédex Ontology Game 🔴⚪

A turn-based **Pokémon battle roguelike** played in the browser, where the entire
game — team building, opponents, type effectiveness, enemy AI, and evolutions — is
driven by **live SPARQL queries against an OWL knowledge graph** of the Pokémon world
(Generations 1–3).

Built as a project for the *Actionable Knowledge Representation* course at the
**University of Bremen**.

![Battle screenshot](docs/screenshot-battle.png)

---

## What is this?

Most games hard-code their data. This one doesn't. Every fact the game needs —
a Pokémon's stats, its types, the moves it can learn, which type beats which,
what it evolves into — lives in a formal **OWL ontology** (35,174 triples) and is
fetched at runtime with **SPARQL**.

The result is a small but complete roguelike: pick a starter, build a team of six,
and fight through ten rounds of increasingly tough opponents, evolving your Pokémon
along the way. Lose your whole team and the run is over.

The project has two halves:

1. **The knowledge graph** — a Pokédex ontology covering all 386 Pokémon of
   Generations 1–3, their types, abilities, 864 moves, level-up learnsets, the full
   18×18 type-effectiveness matrix, and evolution chains. Grounded in the
   **SOMA/DUL** upper ontology.
2. **The game** — a React app that queries the ontology over SPARQL and turns it
   into a playable Game Boy Advance–style battle experience.

---

## Play it

### Option A — Instant play (no setup)

The game ships with a bundled offline copy of the ontology data, so it runs
immediately with no database required:

```bash
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and play.

> When no SPARQL endpoint is reachable, the game automatically falls back to the
> bundled data. This is the fastest way to try it.

### Option B — The real thing (live SPARQL)

This is how the game is *meant* to run: every action in the game sends a live
SPARQL query to a real triple store (a small database built specifically for
ontologies), which answers by querying the actual `.ttl` ontology file. Option A
above is just a convenience fallback — this is the real deal, and it's what you
should use if you want to see the ontology actually being queried while you play.

You do **not** need any programming experience for this. It's mostly
copy-pasting a few commands into a terminal window. It takes about 10 minutes
the first time.

#### Step 1 — Check that Java is installed

The triple store we use (Apache Jena Fuseki) is a Java program, so Java needs
to be on your computer first.

- **Windows:** press `Win + R`, type `cmd`, press Enter. A black window opens.
- **Mac:** open the **Terminal** app (search for it with Spotlight, `Cmd + Space`).

In that window, type:

```
java -version
```

- If you see a version number (anything like `java version "17..."` or
  `"21..."` or `"23..."`), you're good — skip to Step 2.
- If you see an error like "command not found" or "not recognized", install
  Java first from **[adoptium.net](https://adoptium.net)** (pick the recommended
  download for your operating system, run the installer, click through with
  the defaults). Then close and reopen your terminal window and try
  `java -version` again to confirm it worked.

#### Step 2 — Download and unzip Fuseki

1. Go to **[jena.apache.org/download](https://jena.apache.org/download/)**.
2. Download **Apache Jena Fuseki** (look for a file like
   `apache-jena-fuseki-X.X.X.zip`).
3. Unzip it somewhere easy to find, like your Downloads folder or Desktop.
   Right-click the `.zip` file → "Extract All" (Windows) or just double-click
   it (Mac).

#### Step 3 — Start Fuseki

In your terminal window, navigate into the folder you just unzipped. You'll
need to adjust the path below to match where you put it — for example:

```
cd Downloads/apache-jena-fuseki-6.1.0
```

Then start the server with this command:

**Windows (PowerShell):**
```
.\fuseki-server.bat --update --mem /pokedex
```

**Mac/Linux (Terminal):**
```
./fuseki-server --update --mem /pokedex
```

You should see several lines of text appear, ending with something like
`Start Fuseki`. **Leave this window open** — as long as it's running, the
database is alive. If you close it, the server stops.

#### Step 4 — Upload the ontology file

Open a normal web browser and go to:

```
http://localhost:3030
```

You'll see the Fuseki web interface with a dataset called `pokedex` already
listed (because we created it with `/pokedex` in Step 3). Click on it, then
look for an **"add data"** or **"upload files"** option. Select the ontology
file from this project, `akr_ontology_kilic_rajput_v8.ttl`, and upload it.

#### Step 5 — Start the game

Open a **second, new** terminal window (leave the Fuseki one running in the
background). Navigate into this project's folder, for example:

```
cd Documents/GitHub/PokeDex-Ontology
```

Then run:

```
npm install
npm run dev
```

The first command installs everything the game needs (only required once).
The second one starts the game itself and prints a URL, usually
`http://localhost:5173` — open that in your browser and play.

---

## How to play

| | |
|---|---|
| **Goal** | Survive all 10 rounds. |
| **Lose** | Your whole team of 6 faints. |
| **Team** | 1 starter you pick + 5 random Pokémon from your chosen region. |
| **Rounds** | 1–3 easy · 4–6 medium · 7–9 hard · 10 = a Legendary boss. |
| **Battles** | Choose which Pokémon fights, then a move. The enemy AI answers with its most effective move. |
| **Type matchups** | Damage uses the real Gen-3 formula and the ontology's effectiveness matrix (dual types stack — Rock hits Fire/Flying for 4×). |
| **PP** | Every move has limited uses. Out of PP → Struggle. |
| **Permadeath** | A fainted Pokémon is gone for the rest of the run, and HP doesn't regenerate… |
| **Evolution** | …except evolving. Between rounds you may evolve **one** Pokémon, which restores its full HP and boosts its stats. |

<p align="center">
  <img src="docs/screenshot-start.png" width="45%" alt="Title screen">
  <img src="docs/screenshot-starter.png" width="45%" alt="Starter selection">
</p>

---

## How it works

```
 React UI  ──►  SPARQL query strings  ──►  Fuseki / triple store  ──►  ontology
    ▲                                                                      │
    └───────────────  parsed results (Pokémon, moves, effectiveness)  ◄────┘
```

Everything the game does maps to a SPARQL query. A few examples:

- **Pick a starter** → fetch the three starters of a generation.
- **Fill the team** → fetch five random non-legendary Pokémon from that generation.
- **A move connects** → look up its type's effectiveness against the target's types.
- **Enemy's turn** → query for the opponent's strongest *super-effective* move; if
  none exists, its strongest move overall.
- **After a round** → ask whether each surviving Pokémon has an evolution.

All queries live in `src/hooks/queries.js`, and all battle math (damage,
dual-type effectiveness, AI choice, Struggle) lives in `src/utils/battle.js`.

---

## Tech

- **Frontend:** React + Vite
- **Data:** OWL / Turtle ontology, queried via SPARQL (Apache Jena Fuseki)
- **Upper ontology:** SOMA / DUL
- **Sprites:** [PokeAPI](https://pokeapi.co) (front & back, animated)
- **Styling:** hand-written CSS in an authentic Gen-3 (Ruby/Sapphire/Emerald) battle style

### Project layout

```
src/
├── App.jsx                 Screen router (state-driven, no external router)
├── index.css               Full GBA battle theme + animations
├── screens/                Title, starter, team, battle, summary, evolution, win, lose
├── components/             HP box, HP bar, Pokémon card, move button, type badge
├── hooks/
│   ├── useSparql.js        Sends queries to the endpoint (with offline fallback)
│   └── queries.js          All 11 SPARQL queries
├── state/gameState.js      State shape, result parsing, sprite URLs, helpers
├── utils/battle.js         Damage formula, effectiveness, enemy AI, Struggle
└── mock/                   Bundled ontology data for offline play
```

---

## About the ontology

The knowledge graph was built from several sources and merged into a single
consistent file (`akr_ontology_kilic_rajput_v8.ttl`, 35,174 triples):

- **Base Pokémon data** (stats, types, dimensions) via a SPARQL `CONSTRUCT` from a
  public TriplyDB dataset.
- **Evolutions, abilities, moves and Gen-3 learnsets** scraped from *pokemondb.net*
  with Python (`BeautifulSoup` + `rdflib`).
- **The 18×18 type-effectiveness matrix**, modelled by hand.

Domain classes are grounded in the SOMA/DUL upper ontology (Pokémon and Trainers as
agents, moves as actions, types and abilities as concepts, learnsets reified as
situations), and the ontology passes the HermiT reasoner as consistent.

---

## Authors

**Firaz Kilic** & **Prakhar Rajput** — University of Bremen,
*Actionable Knowledge Representation*.

## Credits & notes

Pokémon and all related names are trademarks of Nintendo / Game Freak / The Pokémon
Company. This is a non-commercial student project for educational purposes. Sprites
are served from PokeAPI.
