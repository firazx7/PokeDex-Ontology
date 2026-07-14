// =============================================
// MoveButton.jsx — GBA-style move button
// =============================================
import { getTypeColor } from '../utils/typeColors'

export default function MoveButton({ move, onClick, disabled = false }) {
  if (!move) return null
  const noPP = move.currentPP <= 0
  const isDisabled = disabled || noPP
  const lowPP = move.currentPP <= move.maxPP * 0.25

  return (
    <button
      className={`move-btn ${isDisabled ? 'move-btn-disabled' : ''}`}
      onClick={!isDisabled ? () => onClick(move) : undefined}
      style={{ borderLeft: `8px solid ${getTypeColor(move.type)}` }}
    >
      <div>
        <div className="move-btn-name">{move.name}</div>
        <div style={{ fontFamily: 'VT323', fontSize: 16, color: getTypeColor(move.type) }}>
          {move.type}
        </div>
      </div>
      <div className="move-btn-meta">
        <div style={{ fontWeight: 'bold' }}>PWR {move.power}</div>
        <div style={{ color: lowPP ? '#d84838' : '#58607a' }}>
          PP {move.currentPP}/{move.maxPP}
        </div>
      </div>
    </button>
  )
}
