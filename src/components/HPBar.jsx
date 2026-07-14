// =============================================
// HPBar.jsx — Compact HP bar (used on team cards)
// =============================================
import { getHPColor } from '../state/gameState'

export default function HPBar({ currentHP, maxHP }) {
  const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100))
  const color = getHPColor(currentHP, maxHP)
  return (
    <div style={{ width: '100%' }}>
      <div className="hp-track" style={{ marginBottom: 3 }}>
        <div className="hp-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div style={{ fontSize: 15, color: '#cdd7ee', textAlign: 'right', fontFamily: 'VT323' }}>
        {Math.max(0, currentHP)}/{maxHP}
      </div>
    </div>
  )
}
