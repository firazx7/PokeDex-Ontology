// =============================================
// battle.js — Battle Engine
// =============================================
// This module contains ALL the battle math so the
// BattleScreen only has to handle UI and call these
// functions. It handles:
//   - dual-type effectiveness (both defender types)
//   - the Gen-3 damage formula
//   - the opponent AI move choice
//   - Struggle (when a Pokemon is out of PP)
//
// These functions need a `query` function passed in
// (from useSparql) because type effectiveness lives
// in the ontology and must be looked up via SPARQL.

import { QUERIES } from '../hooks/queries'
import { getMultiplier } from '../state/gameState'

const LEVEL = 50

// ─────────────────────────────────────────────
// getEffectiveness — full multiplier vs a defender
// ─────────────────────────────────────────────
// Looks up how effective `attackTypeIRI` (e.g. ':Fire')
// is against EVERY type the defender has, and multiplies
// the results together.
//
// Example: Rock vs a Fire/Flying defender
//   Rock vs Fire  = super (2.0)
//   Rock vs Flying = super (2.0)
//   → total 4.0  (double super effective!)
//
// Returns: { multiplier: number, label: string }
//   label is one of: 'super' | 'half' | 'none' | 'normal'
//   (label reflects the COMBINED result, for the on-screen message)
export async function getEffectiveness(query, attackTypeIRI, defenderTypes) {
  let multiplier = 1.0

  for (const defType of defenderTypes) {
    const rows = await query(
      QUERIES.getTypeEffectiveness(attackTypeIRI, `:${defType}`)
    )
    const result = rows[0]?.result?.value || 'normal'
    multiplier *= getMultiplier(result)
  }

  // Derive a label from the combined multiplier for the UI message
  let label = 'normal'
  if (multiplier === 0) label = 'none'
  else if (multiplier > 1) label = 'super'
  else if (multiplier < 1) label = 'half'

  return { multiplier, label }
}

// ─────────────────────────────────────────────
// calculateDamage — Gen-3 damage formula
// ─────────────────────────────────────────────
// attacker / defender: PokemonObject
// power: the move's power
// multiplier: the combined type multiplier from getEffectiveness
//
// Returns an integer amount of damage (never negative).
export function calculateDamage(attacker, defender, power, multiplier) {
  if (power <= 0) return 0
  if (multiplier === 0) return 0   // immune

  const base =
    (2 * LEVEL / 5 + 2) * power * attacker.attack / defender.defense / 50 + 2
  const damage = Math.floor(base * multiplier)

  return Math.max(1, damage) // a connecting move always does at least 1
}

// ─────────────────────────────────────────────
// hasUsableMoves — does this Pokemon have any PP left?
// ─────────────────────────────────────────────
export function hasUsableMoves(pokemon) {
  return pokemon.moves.some(m => m.currentPP > 0)
}

// ─────────────────────────────────────────────
// STRUGGLE constants (used when all PP are gone)
// ─────────────────────────────────────────────
export const STRUGGLE = {
  name: 'Struggle',
  damageToTarget: 50, // fixed, ignores type effectiveness
  recoilToSelf: 25,   // fixed self-damage
}

// ─────────────────────────────────────────────
// chooseOpponentMove — the opponent AI
// ─────────────────────────────────────────────
// Decides which move the opponent uses against the player.
// Priority:
//   1. Strongest move that is SUPER EFFECTIVE vs the player's types
//   2. Otherwise, the strongest move overall
//   3. If no usable move at all → Struggle
//
// opponent: PokemonObject (the AI)
// playerTypes: string[] (the active player Pokemon's types)
//
// Returns one of:
//   { kind: 'move', move: { name, power, typeIRI } }
//   { kind: 'struggle' }
export async function chooseOpponentMove(query, opponent, playerTypes) {
  // Try to find a super effective move against ANY of the player's types.
  // We check each player type; the first super-effective hit wins.
  for (const pType of playerTypes) {
    const rows = await query(
      QUERIES.getSuperEffectiveMove(opponent.iriShort, `:${pType}`)
    )
    if (rows.length > 0) {
      const r = rows[0]
      return {
        kind: 'move',
        move: {
          name: r.moveName?.value || 'Attack',
          power: parseInt(r.power?.value || '0', 10),
          // getSuperEffectiveMove doesn't return the move type, but the
          // move is by definition super-effective, so for the damage step
          // we look its type up from the opponent's own move list if needed.
          typeIRI: null,
        },
      }
    }
  }

  // Fallback: strongest move overall (this query also omits move type)
  const fbRows = await query(QUERIES.getBestMove(opponent.iriShort))
  if (fbRows.length > 0) {
    const r = fbRows[0]
    return {
      kind: 'move',
      move: {
        name: r.moveName?.value || 'Attack',
        power: parseInt(r.power?.value || '0', 10),
        typeIRI: null,
      },
    }
  }

  // No moves with power at all → Struggle
  return { kind: 'struggle' }
}

// ─────────────────────────────────────────────
// resolveOpponentMoveType — find a move's type IRI
// ─────────────────────────────────────────────
// The AI queries (Q7/Q8) don't return the move's type, which we
// need to compute effectiveness against the player. This helper
// loads the opponent's full move list once and finds the type of
// the chosen move by name.
//
// opponentMoves: MoveObject[] (from getMoves on the opponent)
// moveName: string
// Returns a type IRI string like ':Fire' (defaults ':Normal')
export function resolveOpponentMoveType(opponentMoves, moveName) {
  const found = opponentMoves.find(m => m.name === moveName)
  return found ? found.typeIRI : ':Normal'
}
