// =============================================
// gameState.js — Central Game State
// =============================================
// This file defines the shape of the game state
// and helper functions to work with it.
//
// The game state lives in App.jsx as a useState hook.
// Pass it down to screens as props.
//
// STRUCTURE:
// gameState = {
//   trainerName: string,
//   generation: 1 | 2 | 3,
//   round: number (1-10),
//   team: [ PokemonObject, ... ],   // 6 Pokemon
//   currentOpponent: PokemonObject | null,
//   phase: string,                  // which screen to show
//   roundSummary: object | null,    // data for round summary screen
// }
//
// PokemonObject = {
//   iri: string,          // e.g. 'http://...#Charizard'
//   iriShort: string,     // e.g. ':Charizard' (for SPARQL queries)
//   name: string,
//   nationalNum: number,  // for PokeAPI sprite URL
//   types: string[],      // e.g. ['Fire', 'Flying']
//   currentHP: number,
//   maxHP: number,
//   attack: number,
//   defense: number,
//   fainted: boolean,
//   moves: [ MoveObject, ... ]
// }
//
// MoveObject = {
//   iri: string,
//   name: string,
//   power: number,
//   type: string,         // e.g. 'Fire'
//   typeIRI: string,      // e.g. ':Fire' (for SPARQL queries)
//   currentPP: number,
//   maxPP: number,
// }

// ─────────────────────────────────────────────
// GAME PHASES (which screen is currently shown)
// ─────────────────────────────────────────────
export const PHASES = {
  START:        'START',        // Start screen (name + gen selection)
  STARTER:      'STARTER',      // Starter selection
  TEAM_PREVIEW: 'TEAM_PREVIEW', // Show full team before run
  BATTLE:       'BATTLE',       // Main battle screen
  ROUND_SUMMARY:'ROUND_SUMMARY',// After round: summary
  EVOLUTION:    'EVOLUTION',    // After summary: evolution choices
  WIN:          'WIN',          // All 10 rounds won
  LOSE:         'LOSE',         // All Pokemon fainted
}

// ─────────────────────────────────────────────
// Round difficulty helper
// ─────────────────────────────────────────────
export function getDifficulty(round) {
  if (round <= 3) return 'easy'
  if (round <= 6) return 'medium'
  if (round <= 9) return 'hard'
  return 'boss' // round 10
}

// ─────────────────────────────────────────────
// Parse a SPARQL result row into a PokemonObject
// Use after Q1, Q2, Q3, Q4, Q10
// ─────────────────────────────────────────────
export function parsePokemon(row) {
  const iri = row.pokemon?.value || row.evolvedIRI?.value || ''
  const shortName = iri.split('#')[1] || ''

  // Types come as comma-separated IRIs: 'http://...#Fire,http://...#Flying'
  const typesRaw = row.types?.value || ''
  const types = typesRaw
    .split(',')
    .filter(Boolean)
    .map(t => t.split('#')[1] || t)

  const hp = parseInt(row.hp?.value || '50')

  return {
    iri,
    iriShort: `:${shortName}`,
    name: row.name?.value || shortName,
    nationalNum: parseInt(row.num?.value || '1'),
    types,
    currentHP: hp,
    maxHP: hp,
    attack: parseInt(row.attack?.value || '50'),
    defense: parseInt(row.defense?.value || '50'),
    fainted: false,
    moves: [], // filled separately via getMoves query
  }
}

// ─────────────────────────────────────────────
// Parse a SPARQL result row into a MoveObject
// Use after Q5, Q11
// ─────────────────────────────────────────────
export function parseMove(row) {
  const pp = parseInt(row.pp?.value || '10')
  const typeIRI = row.move?.value
    ? `:${(row.moveType?.value || 'Normal')}`
    : ':Normal'

  return {
    iri: row.move?.value || '',
    name: row.moveName?.value || 'Unknown',
    power: parseInt(row.power?.value || '0'),
    type: row.moveType?.value || 'Normal',
    typeIRI: `:${row.moveType?.value || 'Normal'}`,
    currentPP: pp,
    maxPP: pp,
  }
}

// ─────────────────────────────────────────────
// Get sprite URL from PokeAPI
// nationalNum: the Pokemon's national dex number
// animated: true for GIF, false for static PNG
// ─────────────────────────────────────────────
export function getSpriteUrl(nationalNum, animated = true) {
  if (animated) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${nationalNum}.gif`
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${nationalNum}.png`
}

// ─────────────────────────────────────────────
// Type effectiveness multiplier
// result: "super" | "half" | "none" | "normal"
// ─────────────────────────────────────────────
export function getMultiplier(result) {
  switch (result) {
    case 'super':  return 2.0
    case 'half':   return 0.5
    case 'none':   return 0.0
    default:       return 1.0
  }
}

// ─────────────────────────────────────────────
// Get HP bar color based on HP percentage
// ─────────────────────────────────────────────
export function getHPColor(currentHP, maxHP) {
  const pct = currentHP / maxHP
  if (pct > 0.5) return '#3BA55D'  // green
  if (pct > 0.2) return '#FFCB05'  // yellow
  return '#EE1515'                  // red
}

// ─────────────────────────────────────────────
// Initial empty game state
// ─────────────────────────────────────────────
export const INITIAL_STATE = {
  trainerName: '',
  generation: null,
  round: 1,
  team: [],
  currentOpponent: null,
  phase: PHASES.START,
  roundSummary: null,
}
