// =============================================
// MoveButton.jsx — Move Selection Button
// =============================================
// Shows one move with its name, type, power, and remaining PP.
// Greyed out and disabled when PP = 0.
//
// USAGE:
//   <MoveButton move={moveObject} onClick={handleMoveSelect} />

import { getTypeColor } from '../utils/typeColors'

export default function MoveButton({ move, onClick, disabled = false }) {
  if (!move) return null

  const noPP = move.currentPP <= 0
  const isDisabled = disabled || noPP

  return (
    <button
      onClick={!isDisabled ? () => onClick(move) : undefined}
      style={{
        background: noPP
          ? 'rgba(255,255,255,0.05)'
          : `linear-gradient(135deg, ${getTypeColor(move.type)}33, rgba(255,255,255,0.05))`,
        border: noPP
          ? '2px solid rgba(255,255,255,0.1)'
          : `2px solid ${getTypeColor(move.type)}88`,
        borderRadius: '10px',
        padding: '12px 16px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: noPP ? 0.4 : 1,
        transition: 'all 0.15s ease',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
      }}
    >
      {/* Left: name and type */}
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>{move.name}</div>
        <div style={{ fontSize: '11px', color: getTypeColor(move.type), marginTop: '2px' }}>
          {move.type}
        </div>
      </div>

      {/* Right: power and PP */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: '14px' }}>
          {move.power > 0 ? `${move.power} PWR` : '—'}
        </div>
        <div style={{
          fontSize: '11px',
          color: move.currentPP <= move.maxPP * 0.25 ? '#EE1515' : 'rgba(255,255,255,0.6)',
          marginTop: '2px',
        }}>
          PP {move.currentPP}/{move.maxPP}
        </div>
      </div>
    </button>
  )
}
