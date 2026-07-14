// =============================================
// StarterScreen.jsx — Pick a starter (FULLY BUILT)
// =============================================
import { useEffect, useState } from 'react'
import { PHASES, parsePokemon, parseMove } from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'
import PokemonCard from '../components/PokemonCard'

export default function StarterScreen({ gameState, setGameState }) {
  const { query } = useSparql()
  const [starters, setStarters] = useState([])
  const [selected, setSelected] = useState(null)
  const [building, setBuilding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const rows = await query(QUERIES.getStarters(gameState.generation))
      if (cancelled) return
      setStarters(rows.map(r => parsePokemon(r)))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.generation])

  const withMoves = async (p) => {
    const rows = await query(QUERIES.getMoves(p.iriShort))
    return { ...p, moves: rows.map(parseMove) }
  }

  const confirm = async () => {
    if (!selected || building) return
    setBuilding(true)
    try {
      const starter = await withMoves(selected)
      const teamRows = await query(QUERIES.getRandomTeam(gameState.generation))
      const team = await Promise.all(teamRows.map(r => parsePokemon(r)).map(withMoves))
      setGameState(prev => ({ ...prev, team: [starter, ...team], phase: PHASES.TEAM_PREVIEW }))
    } catch (e) {
      console.error(e); setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <p className="blink pixel" style={{ fontSize: 11, color: '#cdd7ee' }}>loading starters...</p>
      </div>
    )
  }

  return (
    <div className="screen gap24">
      <h2 className="game-title" style={{ fontSize: 16 }}>CHOOSE A STARTER</h2>
      <p className="mono" style={{ fontSize: 20, color: '#8fb4e8' }}>
        {['', 'Kanto', 'Johto', 'Hoenn'][gameState.generation]} · Professor's lab
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 760 }}>
        {starters.map(p => (
          <div key={p.iri} style={{ width: 210 }}>
            <PokemonCard pokemon={p} selected={selected?.iri === p.iri} onClick={() => setSelected(p)} large showHP={false} />
          </div>
        ))}
      </div>

      <button
        onClick={confirm}
        disabled={!selected || building}
        className={`btn ${selected && !building ? 'btn-primary' : 'btn-disabled'}`}
        style={{ fontSize: 12, padding: '16px 28px' }}
      >
        {building ? 'BUILDING TEAM...' : selected ? `I CHOOSE ${selected.name.toUpperCase()}!` : 'PICK ONE'}
      </button>
    </div>
  )
}
