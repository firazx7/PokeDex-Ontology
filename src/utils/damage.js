// =============================================
// damage.js — (kept for backwards compatibility)
// =============================================
// All battle math now lives in battle.js.
// This file re-exports the relevant functions so any
// existing imports of './utils/damage' keep working.

export {
  calculateDamage,
  hasUsableMoves,
  STRUGGLE,
} from './battle'

// calculateStruggle() kept as a convenience wrapper
import { STRUGGLE } from './battle'
export function calculateStruggle() {
  return {
    damageToOpponent: STRUGGLE.damageToTarget,
    recoilToSelf: STRUGGLE.recoilToSelf,
  }
}
