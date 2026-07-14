// =============================================
// gameState.js — Central Game State & Helpers
// =============================================
// This file defines:
//   1. The shape of the game state
//   2. Helper functions to parse SPARQL results
//   3. Small utility helpers used across screens
//
// The game state lives in App.jsx as a single useState hook.
// Every screen receives `gameState` and `setGameState` as props.
//
// ─────────────────────────────────────────────
// STATE SHAPE
// ─────────────────────────────────────────────
// gameState = {
//   trainerName:     string,
//   generation:      1 | 2 | 3,
//   round:           number (1-10),
//   team:            PokemonObject[],   // 6 Pokemon
//   currentOpponent: PokemonObject | null,
//   activeIndex:     number | null,     // index in team of the Pokemon currently battling
//   phase:           string,            // which screen to show (see PHASES)
//   roundSummary:    object | null,     // data passed to the round-summary screen
//   battleLog:       string[],          // recent battle messages (optional to use)
// }
//
// PokemonObject = {
//   iri:         string,   // full IRI  e.g. 'http://...#Charizard'
//   iriShort:    string,   // short IRI e.g. ':Charizard' (for SPARQL)
//   name:        string,
//   nationalNum: number,   // for PokeAPI sprite URL
//   types:       string[], // e.g. ['Fire', 'Flying']  (1 or 2 entries)
//   currentHP:   number,
//   maxHP:       number,
//   attack:      number,
//   defense:     number,
//   fainted:     boolean,
//   moves:       MoveObject[],
// }
//
// MoveObject = {
//   iri:       string,
//   name:      string,
//   power:     number,   // 0 means the move has no power (should be filtered out)
//   type:      string,   // e.g. 'Fire'
//   typeIRI:   string,   // e.g. ':Fire'  (for SPARQL type-effectiveness queries)
//   currentPP: number,
//   maxPP:     number,
// }

// ─────────────────────────────────────────────
// GAME PHASES (control which screen renders)
// ─────────────────────────────────────────────
export const PHASES = {
  START:         'START',         // Title screen: trainer name + generation
  STARTER:       'STARTER',       // Pick a starter, team is assembled
  TEAM_PREVIEW:  'TEAM_PREVIEW',  // Show the full team before the run begins
  BATTLE:        'BATTLE',        // Main battle screen (one opponent per round)
  ROUND_SUMMARY: 'ROUND_SUMMARY', // Between-round recap
  EVOLUTION:     'EVOLUTION',     // Evolution choices for all 6 Pokemon
  WIN:           'WIN',           // Survived all 10 rounds
  LOSE:          'LOSE',          // All 6 Pokemon fainted
}

// ─────────────────────────────────────────────
// HP SCALING
// ─────────────────────────────────────────────
// The ontology stores BASE stats (e.g. Charizard baseHP = 78).
// If we used the raw base HP as battle HP, a single strong move
// (power ~90) would one-shot almost everything, and battles would
// be boring. In the real games, a level-50 Pokemon has HP roughly
// 2-3x its base stat. We multiply base HP by this factor so battles
// last several turns and type/stat decisions matter.
//
// Tune this number if battles feel too long or too short.
export const HP_SCALE = 2

// ─────────────────────────────────────────────
// ROUND -> DIFFICULTY MAPPING
// ─────────────────────────────────────────────
// Rounds 1-3 = easy, 4-6 = medium, 7-9 = hard, 10 = boss.
// The BattleScreen uses this to decide which opponent query to run.
export function getDifficulty(round) {
  if (round <= 3) return 'easy'
  if (round <= 6) return 'medium'
  if (round <= 9) return 'hard'
  return 'boss'
}

// ─────────────────────────────────────────────
// parsePokemon — turn a SPARQL row into a PokemonObject
// ─────────────────────────────────────────────
// Works for the results of: getStarters, getRandomTeam,
// getOpponent, getLegendaryBoss.
//
// For getEvolvedStats (which has no ?pokemon column) pass the
// evolved IRI explicitly as the second argument:
//   parsePokemon(row, evolvedIRIString)
export function parsePokemon(row, explicitIri = null) {
  // Guard: if called via .map(parsePokemon), the 2nd arg is the index (a number).
  // Only accept explicitIri when it's actually a string.
  const safeExplicit = typeof explicitIri === 'string' ? explicitIri : null
  const iri = safeExplicit || row.pokemon?.value || ''
  const shortName = iri.split('#')[1] || ''

  // ?types is a comma-separated list of full type IRIs:
  //   'http://...#Fire,http://...#Flying'
  const typesRaw = row.types?.value || ''
  const types = typesRaw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.split('#')[1] || t)

  const baseHP = parseInt(row.hp?.value || '50', 10)
  const scaledHP = baseHP * HP_SCALE

  return {
    iri,
    iriShort: `:${shortName}`,
    name: row.name?.value || shortName,
    nationalNum: parseInt(row.num?.value || '1', 10),
    types,
    currentHP: scaledHP,
    maxHP: scaledHP,
    attack: parseInt(row.attack?.value || '50', 10),
    defense: parseInt(row.defense?.value || '50', 10),
    fainted: false,
    moves: [], // filled in separately via a getMoves / getEvolvedMoves query
  }
}

// ─────────────────────────────────────────────
// parseMove — turn a SPARQL row into a MoveObject
// ─────────────────────────────────────────────
// Works for the results of getMoves and getEvolvedMoves.
// These queries only return moves that HAVE a power value,
// so status moves are already excluded at the query level.
export function parseMove(row) {
  const pp = parseInt(row.pp?.value || '10', 10)
  const typeName = row.moveType?.value || 'Normal'

  return {
    iri: row.move?.value || '',
    name: row.moveName?.value || 'Unknown',
    power: parseInt(row.power?.value || '0', 10),
    type: typeName,
    typeIRI: `:${typeName}`,   // used directly in type-effectiveness queries
    currentPP: pp,
    maxPP: pp,
  }
}

// ─────────────────────────────────────────────
// getSpriteUrl — PokeAPI sprite from national dex number
// ─────────────────────────────────────────────
// animated = true  → Gen-5 animated GIF (nicer)
// animated = false → static PNG (fallback)
export function getSpriteUrl(nationalNum, animated = true) {
  if (animated) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${nationalNum}.gif`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalNum}.png`
}

// Back sprite — used for the player's own Pokemon in battle,
// so you see it from behind just like the real games.
export function getBackSpriteUrl(nationalNum, animated = true) {
  if (animated) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${nationalNum}.gif`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${nationalNum}.png`
}

// ─────────────────────────────────────────────
// getMultiplier — map an effectiveness string to a number
// ─────────────────────────────────────────────
// Used for a SINGLE type lookup. For dual-type defenders,
// multiply the two results together (see battle.js).
export function getMultiplier(result) {
  switch (result) {
    case 'super': return 2.0
    case 'half':  return 0.5
    case 'none':  return 0.0
    default:      return 1.0   // 'normal' or anything unexpected
  }
}

// ─────────────────────────────────────────────
// getHPColor — HP-bar color based on remaining percentage
// ─────────────────────────────────────────────
export function getHPColor(currentHP, maxHP) {
  const pct = maxHP > 0 ? currentHP / maxHP : 0
  if (pct > 0.5) return '#3BA55D'  // green
  if (pct > 0.2) return '#FFCB05'  // yellow
  return '#EE1515'                 // red
}

// ─────────────────────────────────────────────
// Small team helpers
// ─────────────────────────────────────────────
// Return the indices of all team members that can still fight.
export function livingTeamIndices(team) {
  return team
    .map((p, i) => (p.fainted ? -1 : i))
    .filter(i => i !== -1)
}

// True if every team member has fainted (the lose condition).
export function isTeamWiped(team) {
  return team.length > 0 && team.every(p => p.fainted)
}

// ─────────────────────────────────────────────
// INITIAL_STATE — a fresh game
// ─────────────────────────────────────────────
export const INITIAL_STATE = {
  trainerName: '',
  generation: null,
  round: 1,
  team: [],
  currentOpponent: null,
  activeIndex: null,
  phase: PHASES.START,
  roundSummary: null,
  battleLog: [],
}
