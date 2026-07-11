// =============================================
// damage.js — Damage Calculation
// =============================================
// Gen 3 damage formula:
// Damage = ((2 x Level / 5 + 2) x Power x Attack / Defense / 50 + 2) x TypeMultiplier
//
// All Pokemon are fixed at Level 50 for this game.

const LEVEL = 50

// ─────────────────────────────────────────────
// Calculate damage for a normal move
// attacker: PokemonObject (the attacker)
// defender: PokemonObject (the defender)
// power: number (move's power value)
// typeMultiplier: number (2.0 / 1.0 / 0.5 / 0.0)
// ─────────────────────────────────────────────
export function calculateDamage(attacker, defender, power, typeMultiplier) {
  if (power <= 0) return 0  // status moves deal no damage

  const base = (2 * LEVEL / 5 + 2) * power * attacker.attack / defender.defense / 50 + 2
  const damage = Math.floor(base * typeMultiplier)

  // Minimum 1 damage if the move connects (except if immune)
  if (typeMultiplier === 0) return 0
  return Math.max(1, damage)
}

// ─────────────────────────────────────────────
// Struggle — used when ALL moves are at 0 PP
// Returns: { damageToOpponent: 50, recoilToSelf: 25 }
// Struggle ignores type effectiveness.
// ─────────────────────────────────────────────
export function calculateStruggle() {
  return {
    damageToOpponent: 50,
    recoilToSelf: 25,
  }
}

// ─────────────────────────────────────────────
// Check if a Pokemon has any moves with PP left
// pokemon: PokemonObject
// Returns: boolean
// ─────────────────────────────────────────────
export function hasUsableMoves(pokemon) {
  return pokemon.moves.some(move => move.currentPP > 0)
}
