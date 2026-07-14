// =============================================
// EvolutionScreen.jsx (FULLY BUILT)
// =============================================
import { useEffect, useState } from 'react'
import { PHASES, parsePokemon, parseMove } from '../state/gameState'
import { useSparql } from '../hooks/useSparql'
import { QUERIES } from '../hooks/queries'
import PokemonCard from '../components/PokemonCard'

export default function EvolutionScreen({ gameState, setGameState }) {
  const { query } = useSparql()
  const [team, setTeam] = useState(gameState.team)
  const [evoData, setEvoData] = useState({})
  const [loading, setLoading] = useState(true)
  const [evolving, setEvolving] = useState(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const data = {}
      for (let i = 0; i < team.length; i++) {
        if (team[i].fainted) continue
        const rows = await query(QUERIES.checkEvolution(team[i].iriShort))
        if (rows.length > 0) {
          data[i] = { evolvedIRI: rows[0].evolved.value, evolvedName: rows[0].evolvedName.value }
        }
      }
      if (!cancelled) { setEvoData(data); setLoading(false) }
    }
    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const evolve = async (index) => {
    const evo = evoData[index]
    if (!evo || evolving !== null) return
    setEvolving(index)
    const shortIRI = `:${evo.evolvedIRI.split('#')[1]}`
    const statRows = await query(QUERIES.getEvolvedStats(shortIRI))
    const evolved = parsePokemon(statRows[0], evo.evolvedIRI)
    const moveRows = await query(QUERIES.getEvolvedMoves(shortIRI))
    evolved.moves = moveRows.map(parseMove)   // full HP already set by parsePokemon
    setTeam(prev => prev.map((p, i) => i === index ? evolved : p))
    setEvoData(prev => { const n = { ...prev }; delete n[index]; return n })
    setEvolving(null)
  }

  const cont = () => {
    if (gameState.round >= 10) {
      setGameState(prev => ({ ...prev, team, phase: PHASES.WIN }))
    } else {
      setGameState(prev => ({
        ...prev, team, round: prev.round + 1,
        currentOpponent: null, activeIndex: null, phase: PHASES.BATTLE,
      }))
    }
  }

  if (loading) {
    return <div className="screen"><p className="blink pixel" style={{ fontSize: 11, color: '#cdd7ee' }}>checking evolutions...</p></div>
  }

  const any = Object.keys(evoData).length > 0

  return (
    <div className="screen gap16">
      <h2 className="game-title" style={{ fontSize: 16 }}>EVOLUTION</h2>
      <p className="mono" style={{ fontSize: 22, color: any ? '#58d858' : '#8fb4e8' }}>
        {any ? 'Evolving heals to full HP!' : 'No evolutions available right now.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 720 }}>
        {team.map((p, i) => (
          <div key={p.iri + i} className="stack gap8">
            <PokemonCard pokemon={p} />
            {evoData[i] ? (
              <button className="btn btn-secondary" style={{ fontSize: 9, padding: '10px 6px' }}
                      disabled={evolving !== null} onClick={() => evolve(i)}>
                {evolving === i ? 'EVOLVING...' : `▶ ${evoData[i].evolvedName.toUpperCase()}`}
              </button>
            ) : (
              <div className="mono" style={{ fontSize: 16, color: '#5a6b8a', textAlign: 'center', padding: '8px' }}>
                {p.fainted ? 'fainted' : 'no evolution'}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn btn-primary" style={{ fontSize: 12, padding: '16px 30px' }} onClick={cont}>
        {gameState.round >= 10 ? 'FINISH THE RUN' : `CONTINUE — ROUND ${gameState.round + 1}`}
      </button>
    </div>
  )
}
