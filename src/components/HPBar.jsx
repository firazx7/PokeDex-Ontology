// =============================================
// HPBar.jsx — Animated HP Bar
// =============================================
// Shows a colored HP bar that changes color:
//   > 50% HP  → green
//   > 20% HP  → yellow
//   <= 20% HP → red
//
// The bar animates smoothly when HP changes.
//
// USAGE:
//   <HPBar currentHP={45} maxHP={100} />

import { getHPColor } from '../state/gameState'

export default function HPBar({ currentHP, maxHP }) {
  const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100))
  const color = getHPColor(currentHP, maxHP)

  return (
    <div style={{ width: '100%' }}>
      {/* HP numbers */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '4px',
      }}>
        <span>HP</span>
        <span>{Math.max(0, currentHP)} / {maxHP}</span>
      </div>

      {/* Bar */}
      <div className="hp-bar-container">
        <div
          className="hp-bar-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}
