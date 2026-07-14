// =============================================
// HPBox.jsx — Authentic GBA HP Box
// =============================================
// The cream-colored name/HP box from Gen-3 battles.
//
// USAGE:
//   <HPBox pokemon={pokemonObject} showNumbers />
//
// showNumbers: show "45 / 120" under the bar (true for player,
//              false for opponent — like the real games).

import { getHPColor } from '../state/gameState'

export default function HPBox({ pokemon, showNumbers = false }) {
  if (!pokemon) return null
  const pct = Math.max(0, Math.min(100, (pokemon.currentHP / pokemon.maxHP) * 100))
  const color = getHPColor(pokemon.currentHP, pokemon.maxHP)

  return (
    <div className="hpbox">
      <div className="hpbox-name">
        <span>{pokemon.name}</span>
        <span className="hpbox-lv">Lv50</span>
      </div>
      <div className="hp-row">
        <span className="hp-label">HP</span>
        <div className="hp-track">
          <div className="hp-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      {showNumbers && (
        <div className="hpbox-num">
          {Math.max(0, pokemon.currentHP)} / {pokemon.maxHP}
        </div>
      )}
    </div>
  )
}
