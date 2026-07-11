# Pokedex Roguelike — Developer Guide

**For: Prakhar Rajput**  
**Stack: React + Vite + SPARQL (Fuseki)**  
**Ontology: akr_ontology_kilic_rajput_v8.ttl**

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open in browser
http://localhost:5173
```

> ⚠️ You also need Fuseki running locally. See Section 3.

---

## Project Structure

```
src/
├── App.jsx                    ← Main router — DO NOT edit the routing logic
├── main.jsx                   ← Entry point — DO NOT touch
├── index.css                  ← Global styles + CSS variables
│
├── screens/                   ← YOUR MAIN WORK IS HERE
│   ├── StartScreen.jsx        ✅ Done — name + gen selection
│   ├── StarterScreen.jsx      ✅ Done — starter selection + team build
│   ├── TeamPreviewScreen.jsx  🔨 TODO
│   ├── BattleScreen.jsx       🔨 TODO (most complex)
│   ├── RoundSummaryScreen.jsx 🔨 TODO
│   ├── EvolutionScreen.jsx    🔨 TODO
│   ├── WinScreen.jsx          🔨 TODO
│   └── LoseScreen.jsx         🔨 TODO
│
├── components/                ← Reusable UI pieces (already built)
│   ├── PokemonCard.jsx        ✅ Done
│   ├── HPBar.jsx              ✅ Done
│   ├── MoveButton.jsx         ✅ Done
│   └── TypeBadge.jsx          ✅ Done
│
├── hooks/
│   ├── useSparql.js           ✅ Done — sends queries to Fuseki
│   └── queries.js             ✅ Done — all SPARQL query strings
│
├── state/
│   └── gameState.js           ✅ Done — state shape + helper functions
│
└── utils/
    ├── damage.js              ✅ Done — damage formula
    └── typeColors.js          ✅ Done — type → color mapping
```

---

## Section 1: How React Works Here (Quick Primer)

### State
The entire game lives in one state object in `App.jsx`:
```jsx
const [gameState, setGameState] = useState(INITIAL_STATE)
```

Every screen receives `gameState` and `setGameState` as props.

### Navigating between screens
There is no React Router. Navigation works by changing the `phase` field:
```jsx
// To go to the Battle screen:
setGameState(prev => ({
  ...prev,           // keep everything else
  phase: PHASES.BATTLE,  // change only the phase
}))
```

### Updating state correctly
Always use the function form of setGameState to avoid stale state:
```jsx
// ✅ Correct
setGameState(prev => ({
  ...prev,
  round: prev.round + 1,
}))

// ❌ Wrong — can cause bugs
setGameState({ ...gameState, round: gameState.round + 1 })
```

### useEffect — running code on load
Use `useEffect` to load data when a screen first appears:
```jsx
useEffect(() => {
  const loadData = async () => {
    const results = await query(QUERIES.getOpponent('easy'))
    // do something with results
  }
  loadData()
}, [])  // empty array = run only once on mount
```

---

## Section 2: How SPARQL Works Here

### The useSparql hook
Import it in any screen that needs data:
```jsx
import { useSparql } from '../hooks/useSparql'
const { query, loading, error } = useSparql()
```

`query(queryString)` sends the query to Fuseki and returns an array of result rows.

### The QUERIES object
All queries are pre-written in `queries.js`. Just call them:
```jsx
import { QUERIES } from '../hooks/queries'

// Get easy opponent:
const rows = await query(QUERIES.getOpponent('easy'))

// Get moves for Charizard:
const rows = await query(QUERIES.getMoves(':Charizard'))
```

### Parsing results
SPARQL returns raw objects. Use the helper functions from `gameState.js`:
```jsx
import { parsePokemon, parseMove } from '../state/gameState'

// Parse a Pokemon:
const pokemon = parsePokemon(rows[0])
// → { name: 'Charizard', currentHP: 78, maxHP: 78, types: ['Fire','Flying'], ... }

// Parse moves:
const moves = rows.map(parseMove)
// → [{ name: 'Flamethrower', power: 90, currentPP: 15, maxPP: 15, ... }]
```

### Raw value access (if you need it)
```jsx
const name = rows[0].name.value          // string
const hp   = parseInt(rows[0].hp.value)  // number (always parse!)
```

---

## Section 3: Fuseki Setup

Firaz will run Fuseki and tell you the endpoint URL.
The default is: `http://localhost:3030/pokedex/sparql`

If the URL changes, update it in one place:
```
src/hooks/useSparql.js  →  line: const SPARQL_ENDPOINT = '...'
```

To test if Fuseki is running, open this in your browser:
```
http://localhost:3030
```
You should see the Fuseki admin panel.

---

## Section 4: Screen Instructions

### 🔨 TeamPreviewScreen.jsx
**Purpose:** Show the player their full team of 6 before the run starts.

**What to show:**
- "Your Team, [trainerName]!" heading
- 6 PokemonCard components from `gameState.team`
- Each card shows sprite, name, types (HP bar not needed here, they are all full)
- A "Start Run!" button

**Transition:**
```jsx
setGameState(prev => ({
  ...prev,
  phase: PHASES.BATTLE,
}))
```

**No SPARQL queries needed on this screen.**

---

### 🔨 BattleScreen.jsx
**Purpose:** The main game loop. Most complex screen.

**On load (useEffect):**
1. Determine difficulty from `gameState.round`:
   - round 1-3 → `'easy'`, 4-6 → `'medium'`, 7-9 → `'hard'`, 10 → boss
2. Load opponent: `QUERIES.getOpponent(difficulty)` or `QUERIES.getLegendaryBoss()`
3. Parse opponent with `parsePokemon(rows[0])`
4. Load opponent moves: `QUERIES.getMoves(opponent.iriShort)`
5. Save opponent to state: `setGameState(prev => ({ ...prev, currentOpponent: opponent }))`

**What to show:**
- Top half: opponent Pokemon (large sprite, name, types, HP bar)
- Round indicator: "Round X / 10"
- Player's active Pokemon (show HP bar, PP on moves)
- Move selection buttons using `MoveButton` component
- "Fainted" banner if current Pokemon is at 0 HP

**When player selects a move:**
```jsx
const handlePlayerAttack = async (move) => {
  // 1. Reduce move PP by 1
  // 2. Get type effectiveness (Q6)
  const effRows = await query(QUERIES.getTypeEffectiveness(
    `:${move.type}`,
    `:${opponent.types[0]}`
  ))
  const effectiveness = effRows[0]?.result?.value || 'normal'

  // 3. Calculate damage
  const multiplier = getMultiplier(effectiveness)
  const dmg = calculateDamage(activePokemon, opponent, move.power, multiplier)

  // 4. Apply damage to opponent
  // 5. Show effectiveness message

  // 6. If opponent still alive → opponent attacks back (see below)
  // 7. If opponent fainted → end round
}
```

**Opponent AI attack:**
```jsx
const handleOpponentAttack = async () => {
  // Step 1: try super effective move (Q7)
  const seRows = await query(
    QUERIES.getSuperEffectiveMove(opponent.iriShort, `:${activePokemon.types[0]}`)
  )

  let moveRow = seRows[0]

  // Step 2: fallback to strongest move (Q8)
  if (!moveRow) {
    const fbRows = await query(QUERIES.getBestMove(opponent.iriShort))
    moveRow = fbRows[0]
  }

  if (!moveRow) {
    // Opponent uses Struggle
    const { damageToPlayer } = { damageToPlayer: 50 }
    // apply 50 damage to active player Pokemon
    return
  }

  // Calculate damage and apply
  const power = parseInt(moveRow.power?.value || '0')
  const moveType = `:${moveRow.moveName?.value?.split(' ')[0] || 'Normal'}`
  // ... get effectiveness, calculate damage, apply
}
```

**When round ends (opponent at 0 HP):**
```jsx
setGameState(prev => ({
  ...prev,
  roundSummary: {
    round: prev.round,
    opponentName: prev.currentOpponent.name,
    // add any other summary data
  },
  phase: PHASES.ROUND_SUMMARY,
}))
```

**Check for loss (all Pokemon fainted):**
```jsx
const allFainted = gameState.team.every(p => p.fainted)
if (allFainted) {
  setGameState(prev => ({ ...prev, phase: PHASES.LOSE }))
}
```

**Struggle (all PP = 0):**
```jsx
import { hasUsableMoves, calculateStruggle } from '../utils/damage'

if (!hasUsableMoves(activePokemon)) {
  const { damageToOpponent, recoilToSelf } = calculateStruggle()
  // apply damageToOpponent to opponent
  // apply recoilToSelf to active player Pokemon
}
```

---

### 🔨 RoundSummaryScreen.jsx
**Purpose:** Show what happened in the round before evolution.

**What to show:**
- "Round X Complete!" heading
- Opponent defeated: name + sprite
- Team HP overview (all 6 cards with current HP)
- "Continue" button

**Transition:**
```jsx
setGameState(prev => ({
  ...prev,
  phase: PHASES.EVOLUTION,
}))
```

**No SPARQL queries needed.**

---

### 🔨 EvolutionScreen.jsx
**Purpose:** After each round, check all 6 Pokemon for evolution.

**On load (useEffect):**
For each surviving team member, check evolution:
```jsx
const evolutionChecks = await Promise.all(
  gameState.team
    .filter(p => !p.fainted)
    .map(async p => {
      const rows = await query(QUERIES.checkEvolution(p.iriShort))
      return {
        pokemon: p,
        canEvolve: rows.length > 0,
        evolvedIRI: rows[0]?.evolved?.value,
        evolvedName: rows[0]?.evolvedName?.value,
      }
    })
)
```

**What to show:**
- All 6 team slots
- Pokemon that CAN evolve: show "Evolve → EvolvedName" button
- Pokemon that cannot evolve: show "No evolution" label
- Fainted Pokemon: greyed out, no button
- "Continue to Round X" button at bottom

**When player clicks Evolve:**
```jsx
const handleEvolve = async (pokemon, evolvedIRI) => {
  const iriShort = `:${evolvedIRI.split('#')[1]}`

  // Load evolved stats (Q10)
  const statsRows = await query(QUERIES.getEvolvedStats(iriShort))
  const evolvedPokemon = parsePokemon({ ...statsRows[0], pokemon: { value: evolvedIRI } })

  // Load evolved moves (Q11)
  const moveRows = await query(QUERIES.getEvolvedMoves(iriShort))
  evolvedPokemon.moves = moveRows.map(parseMove)

  // Full HP heal on evolution
  evolvedPokemon.currentHP = evolvedPokemon.maxHP

  // Replace in team
  setGameState(prev => ({
    ...prev,
    team: prev.team.map(p => p.iri === pokemon.iri ? evolvedPokemon : p)
  }))
}
```

**Continue button transition:**
```jsx
// Check if game is won (round 10 was just completed)
if (gameState.round >= 10) {
  setGameState(prev => ({ ...prev, phase: PHASES.WIN }))
} else {
  setGameState(prev => ({
    ...prev,
    round: prev.round + 1,
    currentOpponent: null,
    phase: PHASES.BATTLE,
  }))
}
```

---

### 🔨 WinScreen.jsx
**Purpose:** Victory screen after surviving all 10 rounds.

**What to show:**
- "YOU WIN!" in big text
- Trainer name
- Surviving team members with their current HP
- "Play Again" button

**Play Again:**
```jsx
import { INITIAL_STATE } from '../state/gameState'
setGameState(INITIAL_STATE)
```

---

### 🔨 LoseScreen.jsx
**Purpose:** Game over screen when all Pokemon faint.

**What to show:**
- "GAME OVER" text
- Round reached: `gameState.round`
- All 6 fainted Pokemon
- "Try Again" button

**Try Again:**
```jsx
setGameState(INITIAL_STATE)
```

---

## Section 5: Available Components

### PokemonCard
```jsx
import PokemonCard from '../components/PokemonCard'

<PokemonCard
  pokemon={pokemonObject}   // required
  selected={false}          // blue border if true
  onClick={() => {}}        // makes it clickable
  large={false}             // bigger sprite
  showHP={true}             // show HP bar
/>
```

### HPBar
```jsx
import HPBar from '../components/HPBar'

<HPBar currentHP={45} maxHP={100} />
// Automatically changes color: green → yellow → red
```

### TypeBadge
```jsx
import TypeBadge from '../components/TypeBadge'

<TypeBadge type="Fire" />
<TypeBadge type="Water" small />
```

### MoveButton
```jsx
import MoveButton from '../components/MoveButton'

<MoveButton
  move={moveObject}         // required
  onClick={handleMove}      // called with the move object
  disabled={false}          // force disable
/>
// Automatically disabled and greyed out if PP = 0
```

---

## Section 6: CSS Variables

Use these in inline styles or in CSS:

```css
var(--red)       /* #EE1515 — main red */
var(--yellow)    /* #FFCB05 — logo yellow */
var(--blue)      /* #2A75BB — logo blue */
var(--navy)      /* #0B1B3A — dark background */
var(--green)     /* #3BA55D — green */
var(--white)     /* #FFFFFF */
var(--gray)      /* #5A6B85 */
```

---

## Section 7: Pokemon Sprites

Sprites come from PokeAPI via the `nationalNum` field on every Pokemon object.
The `getSpriteUrl()` function handles this automatically inside `PokemonCard`.

If a GIF is not available, `PokemonCard` automatically falls back to a static PNG.

Manual use:
```jsx
import { getSpriteUrl } from '../state/gameState'

const url = getSpriteUrl(6)          // Charizard animated GIF
const url = getSpriteUrl(6, false)   // Charizard static PNG
```

---

## Section 8: Common Mistakes

**1. Forgetting parseInt()**
SPARQL always returns strings. Numbers must be parsed:
```jsx
// ❌ Wrong
const hp = rows[0].hp.value         // "78" (string)

// ✅ Correct
const hp = parseInt(rows[0].hp.value) // 78 (number)
```

**2. Mutating state directly**
```jsx
// ❌ Wrong — React won't re-render
gameState.team[0].currentHP = 50

// ✅ Correct — create new array/object
setGameState(prev => ({
  ...prev,
  team: prev.team.map((p, i) =>
    i === 0 ? { ...p, currentHP: 50 } : p
  )
}))
```

**3. Calling query() without await**
```jsx
// ❌ Wrong
const rows = query(QUERIES.getMoves(':Charizard'))
// rows is a Promise, not an array!

// ✅ Correct (inside async function)
const rows = await query(QUERIES.getMoves(':Charizard'))
```

**4. Type IRI format**
Types in SPARQL queries need the colon prefix:
```jsx
// ✅ Correct — for SPARQL queries
QUERIES.getTypeEffectiveness(':Fire', ':Water')

// The type on a Pokemon object is just the name:
pokemon.types[0]  // 'Fire'
`:${pokemon.types[0]}`  // ':Fire' — add the colon when needed for queries
```

---

## Questions?

Contact Firaz for:
- Ontology questions (what data is available, property names)
- SPARQL query help
- Fuseki endpoint issues

You handle everything in `src/screens/` and visual design.
