// =============================================
// StartScreen.jsx — Title + trainer setup (FULLY BUILT)
// =============================================
import { useState } from 'react'
import { PHASES } from '../state/gameState'

const GENS = [
  { num: 1, label: 'KANTO', sub: 'Gen I', starters: 'Bulbasaur · Charmander · Squirtle' },
  { num: 2, label: 'JOHTO', sub: 'Gen II', starters: 'Chikorita · Cyndaquil · Totodile' },
  { num: 3, label: 'HOENN', sub: 'Gen III', starters: 'Treecko · Torchic · Mudkip' },
]

export default function StartScreen({ setGameState }) {
  const [name, setName] = useState('')
  const [gen, setGen] = useState(null)
  const canStart = name.trim().length > 0 && gen !== null

  const start = () => {
    if (!canStart) return
    setGameState(prev => ({ ...prev, trainerName: name.trim(), generation: gen, phase: PHASES.STARTER }))
  }

  return (
    <div className="screen">
      <h1 className="game-title" style={{ fontSize: 30, marginBottom: 6 }}>POKEDEX</h1>
      <h2 className="game-title" style={{ fontSize: 18, marginBottom: 8, color: '#fff' }}>ROGUELIKE</h2>
      <p className="mono" style={{ fontSize: 22, color: '#8fb4e8', marginBottom: 32 }}>
        A SPARQL-powered battle run
      </p>

      <div className="stack gap16" style={{ width: '100%', maxWidth: 460 }}>
        <div>
          <label className="pk-label">TRAINER NAME</label>
          <input
            className="pk-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Type your name"
            maxLength={16}
          />
        </div>

        <div>
          <label className="pk-label">CHOOSE YOUR REGION</label>
          <div className="stack gap8">
            {GENS.map(g => (
              <button
                key={g.num}
                onClick={() => setGen(g.num)}
                className="pcard pcard-click"
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderColor: gen === g.num ? 'var(--yellow)' : '#ffffff1a',
                  background: gen === g.num ? '#1d3768' : 'var(--menu-panel)',
                  boxShadow: gen === g.num ? '0 0 0 2px var(--yellow)' : 'none',
                  cursor: 'pointer',
                  padding: '12px 16px',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div className="pixel" style={{ fontSize: 12, color: '#fff' }}>{g.label}</div>
                  <div className="mono" style={{ fontSize: 16, color: '#8fb4e8' }}>{g.starters}</div>
                </div>
                <div className="pixel" style={{ fontSize: 9, color: 'var(--yellow)' }}>{g.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={start}
          className={`btn ${canStart ? 'btn-primary' : 'btn-disabled'}`}
          style={{ marginTop: 8, width: '100%', fontSize: 13, padding: '16px' }}
        >
          {canStart ? 'START ADVENTURE' : 'ENTER NAME & REGION'}
        </button>
      </div>
    </div>
  )
}
