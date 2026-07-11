// =============================================
// StarterScreen.jsx — Starter Selection
// =============================================
// WHAT THIS SCREEN DOES:
// 1. Loads the 3 starters for the chosen generation via SPARQL (Query 1)
// 2. Shows them as clickable cards
// 3. Player clicks one to select it
// 4. Load 5 random team Pokemon via SPARQL (Query 2)
// 5. Go to TeamPreviewScreen
//
// SPARQL QUERIES USED:
//   QUERIES.getStarters(gameState.generation)   → Q1
//   QUERIES.getMoves(':PokemonIRI')              → Q5 (for each team member)
//   QUERIES.getRandomTeam(gameState.generation) → Q2
//
// HOW TO USE useSparql + queries:
//   const { query } = useSparql()
//   const rows = await query(QUERIES.getStarters(1))
//   const pokemon = rows.map(parsePokemon)
//
// TRANSITION TO NEXT SCREEN:
//   setGameState(prev => ({
//     ...prev,
//     team: [starterWithMoves, ...teamWithMoves],
//     phase: PHASES.TEAM_PREVIEW,
//   }))

import { useEffect, useState } from 'react'
import { PHASES, parsePokemon, parseMove } from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'
import PokemonCard from '../components/PokemonCard'

export default function StarterScreen({ gameState, setGameState }) {
  const { query, loading } = useSparql()
  const [starters, setStarters] = useState([])
  const [selected, setSelected] = useState(null)
  const [building, setBuilding] = useState(false)

  // Load starters on mount
  useEffect(() => {
    const loadStarters = async () => {
      const rows = await query(QUERIES.getStarters(gameState.generation))
      const parsed = rows.map(parsePokemon)
      setStarters(parsed)
    }
    loadStarters()
  }, [gameState.generation])

  // Load moves for a Pokemon
  const loadMoves = async (pokemon) => {
    const rows = await query(QUERIES.getMoves(pokemon.iriShort))
    return { ...pokemon, moves: rows.map(parseMove) }
  }

  const handleConfirm = async () => {
    if (!selected || building) return
    setBuilding(true)

    try {
      // Load moves for starter
      const starterWithMoves = await loadMoves(selected)

      // Load 5 random team members
      const teamRows = await query(QUERIES.getRandomTeam(gameState.generation))
      const teamParsed = teamRows.map(parsePokemon)

      // Load moves for each team member
      const teamWithMoves = await Promise.all(teamParsed.map(loadMoves))

      setGameState(prev => ({
        ...prev,
        team: [starterWithMoves, ...teamWithMoves],
        phase: PHASES.TEAM_PREVIEW,
      }))
    } catch (err) {
      console.error('Error building team:', err)
      setBuilding(false)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading starters...</p>
      </div>
    )
  }

  return (
    <div className="screen" style={{ gap: '24px' }}>
      <h2 style={{ color: '#FFCB05', fontFamily: "'Press Start 2P'", fontSize: '16px', textAlign: 'center' }}>
        CHOOSE YOUR STARTER
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
        Generation {gameState.generation} — {['', 'Kanto', 'Johto', 'Hoenn'][gameState.generation]}
      </p>

      {/* Starter cards */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '700px' }}>
        {starters.map(pokemon => (
          <div key={pokemon.iri} style={{ width: '200px' }}>
            <PokemonCard
              pokemon={pokemon}
              selected={selected?.iri === pokemon.iri}
              onClick={() => setSelected(pokemon)}
              large
              showHP={false}
            />
          </div>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selected || building}
        className={`btn ${selected && !building ? 'btn-primary' : 'btn-disabled'}`}
        style={{ padding: '14px 32px', fontSize: '16px' }}
      >
        {building ? 'Building team...' : selected ? `Choose ${selected.name}!` : 'Select a starter'}
      </button>
    </div>
  )
}
